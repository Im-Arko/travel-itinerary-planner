import { useEffect, useId, useState } from "react";
import { planningApi, Place } from "../services/planning";
import { errorMessage } from "../utils/formatters";

export function PlacePicker({
  label,
  value,
  place,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  place: Place | null;
  onChange: (value: string, place: Place | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [options, setOptions] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (value.trim().length < 2 || (place && value === place.label)) {
      setOptions([]);
      setBusy(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError("");
      planningApi
        .places(value, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setOptions(results);
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(errorMessage(err, "Place search is unavailable."));
            setOptions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, place]);
  return (
    <div className="travel-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        maxLength={150}
        disabled={disabled}
        className="travel-input"
        autoComplete="off"
        placeholder="City, region, country"
        aria-describedby={`${id}-help`}
        aria-controls={`${id}-choices`}
        aria-expanded={options.length > 0}
        role="combobox"
        onChange={(event) => onChange(event.target.value, null)}
      />
      <p id={`${id}-help`} className="form-hint">
        {place
          ? `Confirmed: ${place.label}`
          : busy
            ? "Finding places…"
            : "Choose a result to confirm the intended region and country."}
      </p>
      {error && (
        <p role="alert" className="travel-error">
          {error}
        </p>
      )}
      {!!options.length && (
        <ul
          id={`${id}-choices`}
          role="listbox"
          className="border border-[#cbd3bd] rounded-lg bg-white max-h-60 overflow-y-auto mt-2"
        >
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={place?.id === option.id}
                className="w-full text-left px-4 py-3 hover:bg-[#edf1e5] focus:bg-[#edf1e5] border-b border-[#e1e5d8]"
                onClick={() => {
                  onChange(option.label, option);
                  setOptions([]);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!busy &&
        !error &&
        value.trim().length >= 2 &&
        !place &&
        !options.length && (
          <p className="form-hint">
            If no place appears, try its current name and country. A fictional
            place will not receive an invented itinerary.
          </p>
        )}
    </div>
  );
}
