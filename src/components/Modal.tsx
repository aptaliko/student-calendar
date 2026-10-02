'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Native <dialog> wrapper: bottom sheet on phones, centered card on larger screens. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box max-h-[92dvh] p-0 sm:max-w-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100/90 px-5 py-4 backdrop-blur">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex items-center gap-2 border-t border-base-300 bg-base-100/90 px-5 py-3 backdrop-blur">
            {footer}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
