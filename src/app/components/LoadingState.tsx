import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  fullPage?: boolean;
}

export default function LoadingState({
  message = 'Loading…',
  subMessage,
  fullPage = false,
}: LoadingStateProps) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-4 text-center p-12">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      </div>
      <div>
        <p className="font-serif text-lg text-sand-700">{message}</p>
        {subMessage && <p className="text-sm text-sand-400 mt-1">{subMessage}</p>}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {inner}
      </div>
    );
  }

  return <div className="card">{inner}</div>;
}
