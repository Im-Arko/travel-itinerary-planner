import { Compass } from "lucide-react";
interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  fullPage?: boolean;
}
export default function LoadingState({
  message = "Loading…",
  subMessage,
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center px-6 py-16 ${fullPage ? "min-h-[65vh]" : "paper-panel"}`}
    >
      <Compass
        size={34}
        strokeWidth={1}
        className="text-[#7b8f62] animate-pulse mb-6"
      />
      <p className="font-script text-3xl text-[#4d663f]">{message}</p>
      {subMessage && <p className="form-hint mt-3">{subMessage}</p>}
    </div>
  );
}
