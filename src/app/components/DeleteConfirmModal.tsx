import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
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
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-[#d6dcc8] bg-[#fffdf6] p-7 sm:p-9 shadow-2xl backdrop:bg-[#10291d]/65 backdrop:backdrop-blur-sm"
      onCancel={(e) => {
        e.preventDefault();
        if (!isDeleting) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            onCancel();
        }
      }}
    >
      <Trash2 size={26} strokeWidth={1.4} className="text-[#a24f3c] mb-5" />
      <p className="travel-eyebrow text-[#8b8467] mb-2">Your travel journal</p>
      <h2 id="delete-title" className="editorial-title">
        Delete this itinerary?
      </h2>
      <p
        id="delete-description"
        className="text-sm leading-7 text-[#69755e] mt-4"
      >
        “{title}” will be permanently removed from your saved trips.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-7">
        <button
          autoFocus
          onClick={onCancel}
          disabled={isDeleting}
          className="travel-button travel-button-outline"
        >
          Keep it
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="travel-button bg-[#9c4937] border-[#9c4937] hover:bg-[#823c2c] hover:border-[#823c2c]"
        >
          {isDeleting ? "Deleting…" : "Delete trip"}
        </button>
      </div>
    </dialog>
  );
}
