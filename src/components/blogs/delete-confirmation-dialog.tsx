"use client";

import { useEffect, useRef } from "react";

export function DeleteConfirmationDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      cancelRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-scrim">
      <section
        aria-labelledby="delete-title"
        aria-modal="true"
        className="confirmation-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) {
            onCancel();
            return;
          }

          if (event.key === "Tab") {
            const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        ref={dialogRef}
        role="alertdialog"
      >
        <p className="eyebrow">A permanent decision</p>
        <h2 id="delete-title">Delete this story?</h2>
        <p>This cannot be undone. The story and its draft will be removed.</p>
        <div className="dialog-actions">
          <button
            className="button button-outline"
            disabled={pending}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            Keep story
          </button>
          <button
            className="button button-danger"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Deleting…" : "Delete story"}
          </button>
        </div>
      </section>
    </div>
  );
}
