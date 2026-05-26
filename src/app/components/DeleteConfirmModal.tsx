import { Luggage, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-md text-sand-400 hover:text-sand-600 hover:bg-sand-100 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
          <div className="relative">
            <Luggage className="w-8 h-8 text-red-400" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-md bg-red-200 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-red-500" />
            </div>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-center font-serif text-xl font-bold text-sand-800 mb-2">
          Leave this trip behind?
        </h3>

        <p className="text-center text-sand-500 text-sm leading-relaxed mb-6">
          Say goodbye to{' '}
          <span className="font-semibold text-sand-700">
            "{title}"
          </span>
          ? Once it's gone, it's gone for good — no coming back!
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-lg border border-sand-200 text-sand-600 font-medium hover:bg-sand-50 transition-colors disabled:opacity-50"
          >
            Keep it
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-60"
          >
            {isDeleting ? 'Vanishing…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}