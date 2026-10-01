import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "representing" | "addTasks";

interface AddBuyerSideModalProps {
  /** Which step is currently shown */
  step: Step;
  /** Role of the client just added ("buyer" | "seller") */
  newClientRole: "buyer" | "seller";
  /** Name of the newly added client */
  newClientName: string;
  /** Whether the task-append is in progress */
  appending: boolean;
  // Step 1 callbacks
  onRepresentingYes: () => void;
  onRepresentingNo: () => void;
  // Step 2 callbacks
  onAddTasksYes: () => void;
  onAddTasksNo: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Two-step modal triggered when a client of a new role is added to a deal.
 *
 * Step 1 — "Representing or just recording?"
 * Step 2 — "Add tasks for the new side to the board?"
 *
 * Reuses the same backdrop / card shell as ConfirmDialog to stay consistent.
 */
function AddBuyerSideModal({
  step,
  newClientRole,
  newClientName,
  appending,
  onRepresentingYes,
  onRepresentingNo,
  onAddTasksYes,
  onAddTasksNo,
}: AddBuyerSideModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel when it mounts or step changes so keyboard/SR users land here
  useEffect(() => {
    panelRef.current?.focus();
  }, [step]);

  // Escape closes / declines at whichever step is active
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (step === "representing") onRepresentingNo();
      else onAddTasksNo();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [step, onRepresentingNo, onAddTasksNo]);

  const roleLabel = newClientRole === "buyer" ? "buyer" : "seller";
  const displayName = newClientName.trim() || `this ${roleLabel}`;

  return (
    // Backdrop — matches ConfirmDialog exactly
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={step === "representing" ? onRepresentingNo : onAddTasksNo}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="buyer-side-modal-title"
        aria-describedby="buyer-side-modal-message"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-(--cl-white) text-(--cl-dark-blue) rounded shadow-lg p-6 max-w-sm w-full"
      >
        {step === "representing" ? (
          // ── Step 1 ──────────────────────────────────────────────────────────
          <>
            <h2
              id="buyer-side-modal-title"
              className="font-medium text-lg mb-2"
            >
              Representing or recording?
            </h2>
            <p id="buyer-side-modal-message" className="mb-4">
              Are you representing{" "}
              <span className="font-semibold">{displayName}</span>, or just
              recording their contact details?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onRepresentingNo}
                className="px-4 py-2 rounded border"
              >
                Just recording
              </button>
              <button
                onClick={onRepresentingYes}
                className="px-4 py-2 rounded text-(--cl-white) bg-(--cl-accent)"
              >
                Representing
              </button>
            </div>
          </>
        ) : (
          // ── Step 2 ──────────────────────────────────────────────────────────
          <>
            <h2
              id="buyer-side-modal-title"
              className="font-medium text-lg mb-2"
            >
              Add tasks for the {roleLabel} side?
            </h2>
            <p id="buyer-side-modal-message" className="mb-4">
              Would you like to add the {roleLabel} workflow tasks to this
              board? They'll be appended after your existing tasks, starting
              from today.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onAddTasksNo}
                disabled={appending}
                className="px-4 py-2 rounded border"
              >
                Not now
              </button>
              <button
                onClick={onAddTasksYes}
                disabled={appending}
                className="px-4 py-2 rounded text-(--cl-white) bg-(--cl-accent)"
              >
                {appending ? "Adding…" : "Add tasks"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddBuyerSideModal;
