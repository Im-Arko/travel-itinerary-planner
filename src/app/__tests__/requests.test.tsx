import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { request, setAccessToken, getAccessToken } from "../services/api";
import { errorMessage } from "../utils/formatters";

describe("request recovery", () => {
  it("renders validation arrays as useful text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            {
              loc: ["body", "trip_duration"],
              msg: "Must be at least 1",
              type: "greater_than_equal",
            },
          ],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    let message = "";
    try {
      await request("/api/planning/jobs/test");
    } catch (error) {
      message = errorMessage(error, "Try again");
    }
    render(<div role="alert">{message}</div>);
    expect(screen.getByRole("alert").textContent).toContain(
      "Must be at least 1",
    );
    expect(message).not.toContain("[object Object]");
  });
  it("clears an expired session and notifies the interface", async () => {
    setAccessToken("expired-session");
    const listener = vi.fn();
    window.addEventListener("travellant:unauthorized", listener);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"detail":"Token expired"}', {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(request("/api/auth/me")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("travellant:unauthorized", listener);
  });
  it("propagates cancellation to the actual network request", async () => {
    const caller = new AbortController();
    let signal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          signal = options?.signal as AbortSignal;
          signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError")),
          );
        }),
    );
    const pending = request("/api/destinations/page", {
      signal: caller.signal,
    });
    caller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(signal?.aborted).toBe(true);
  });
});
