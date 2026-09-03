import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { WorkflowTask } from "../../lib/workflow";
import {
  countFollowingShiftableTasks,
  shiftFollowingTaskDueDates,
} from "../../lib/workflow";
import ConfirmDialog from "./ConfirmDialog";

interface TaskEditModalProps {
  task: WorkflowTask;
  boardId: string; // needed to scope the "shift following tasks" query/update to this board
  onClose: () => void;
  onSaved: (updatedTask: WorkflowTask) => void;
  // Called after a cascading shift succeeds, so the parent can refetch the
  // whole board -- the edited task's siblings changed in the database but
  // the parent's in-memory task list doesn't know that yet.
  onSiblingsShifted?: () => void;
}

const COLUMN_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];

// Day-count difference between two "YYYY-MM-DD" date strings, computed at
// UTC midnight for both so local timezone offsets can't shift the result
// by a day in either direction.
function daysBetweenISO(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function TaskEditModal({
  task,
  boardId,
  onClose,
  onSaved,
  onSiblingsShifted,
}: TaskEditModalProps) {
  console.log("[TaskEditModal] Rendered", {
    taskId: task.id,
    boardId,
    dueDate: task.due_date,
  });

  const [title, setTitle] = useState(task.title);
  const [column, setColumn] = useState(task.column);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading-shift confirmation state
  const [pendingShift, setPendingShift] = useState<{
    deltaDays: number;
    affectedCount: number;
    savedTask: WorkflowTask;
  } | null>(null);
  const [shifting, setShifting] = useState(false);

  // Lock background scroll while the modal (or its confirmation) is open
  useEffect(() => {
    console.log("[TaskEditModal] Locking background scroll");
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      console.log("[TaskEditModal] Restoring background scroll", {
        originalOverflow,
      });
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Allow Escape to close, same as clicking the cross -- but not while the
  // shift confirmation is open, since ConfirmDialog handles its own Escape.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      console.log("[TaskEditModal] Key pressed", {
        key: e.key,
        confirmationOpen: pendingShift !== null,
      });
      if (e.key === "Escape" && !pendingShift) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pendingShift]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    console.log("[TaskEditModal] Submit started", {
      taskId: task.id,
      title,
      column,
      dueDate,
      hasDescription: description.length > 0,
    });
    setSaving(true);
    setError(null);

    const originalDueDate = task.due_date;
    const newDueDate = dueDate === "" ? null : dueDate;

    console.log("[TaskEditModal] Updating task in Supabase", {
      taskId: task.id,
      originalDueDate,
      newDueDate,
    });

    const { data, error } = await supabase
      .from("workflow_tasks")
      .update({
        title,
        column,
        due_date: newDueDate,
        description: description === "" ? null : description,
      })
      .eq("id", task.id)
      .select(
        "id, board_id, title, column, due_date, template_source_id, sort_order, created_at, description",
      )
      .single();

    setSaving(false);

    if (error) {
      console.log("[TaskEditModal] Task update failed", {
        taskId: task.id,
        error: error.message,
      });
      setError(error.message);
      return;
    }

    const savedTask = data as WorkflowTask;
    console.log("[TaskEditModal] Task update succeeded", {
      taskId: savedTask.id,
      dueDate: savedTask.due_date,
    });

    // Only worth considering a cascade if the due date actually changed,
    // and both the old and new values are real dates (not cleared/blank --
    // there's no sensible "shift amount" if either end is missing).
    const dueDateChanged =
      originalDueDate !== null &&
      newDueDate !== null &&
      originalDueDate !== newDueDate;

    if (!dueDateChanged) {
      console.log("[TaskEditModal] Due date did not change; closing modal");
      onSaved(savedTask);
      onClose();
      return;
    }

    const deltaDays = daysBetweenISO(originalDueDate, newDueDate);
    console.log("[TaskEditModal] Due date changed", {
      originalDueDate,
      newDueDate,
      deltaDays,
    });

    try {
      console.log("[TaskEditModal] Counting shiftable following tasks", {
        boardId,
        sortOrder: task.sort_order,
      });
      const affectedCount = await countFollowingShiftableTasks(
        boardId,
        task.sort_order,
      );

      console.log("[TaskEditModal] Shiftable task count received", {
        affectedCount,
      });

      if (affectedCount === 0) {
        console.log(
          "[TaskEditModal] No shiftable following tasks; closing modal",
        );
        // Nothing downstream to shift (e.g. this is the last task, or
        // everything after it is already done) -- just save and close.
        onSaved(savedTask);
        onClose();
        return;
      }

      // Hold the modal open behind the confirmation -- the task itself is
      // already saved at this point either way; this step only decides
      // whether the *following* tasks move too.
      console.log("[TaskEditModal] Opening shift confirmation", {
        deltaDays,
        affectedCount,
      });
      setPendingShift({ deltaDays, affectedCount, savedTask });
    } catch (err) {
      console.log("[TaskEditModal] Failed to count shiftable tasks", { err });
      // If the count check itself fails, don't block on the cascade --
      // the primary task edit already succeeded, so still close normally.
      console.error("Failed to check for shiftable following tasks:", err);
      onSaved(savedTask);
      onClose();
    }
  }

  async function handleConfirmShift() {
    if (!pendingShift) {
      console.log(
        "[TaskEditModal] Shift confirmation ignored; no pending shift",
      );
      return;
    }
    console.log("[TaskEditModal] Shift confirmation accepted", {
      boardId,
      sortOrder: task.sort_order,
      deltaDays: pendingShift.deltaDays,
    });
    setShifting(true);

    try {
      await shiftFollowingTaskDueDates(
        boardId,
        task.sort_order,
        pendingShift.deltaDays,
      );
      console.log("[TaskEditModal] Following task dates shifted successfully");
      onSiblingsShifted?.();
    } catch (err) {
      console.log("[TaskEditModal] Following task shift failed", { err });
      console.error("Failed to shift following task due dates:", err);
      setError(
        err instanceof Error
          ? `Task saved, but shifting other tasks failed: ${err.message}`
          : "Task saved, but shifting other tasks failed.",
      );
    } finally {
      console.log("[TaskEditModal] Finishing shift confirmation flow");
      setShifting(false);
      onSaved(pendingShift.savedTask);
      setPendingShift(null);
      onClose();
    }
  }

  function handleDeclineShift() {
    if (!pendingShift) {
      console.log("[TaskEditModal] Shift decline ignored; no pending shift");
      return;
    }
    console.log("[TaskEditModal] Shift confirmation declined");
    onSaved(pendingShift.savedTask);
    setPendingShift(null);
    onClose();
  }

  const shiftDirection =
    pendingShift && pendingShift.deltaDays > 0 ? "later" : "earlier";
  const shiftAmount = pendingShift ? Math.abs(pendingShift.deltaDays) : 0;

  return (
    <>
      {/* Backdrop: covers the whole screen, blurs and dims everything behind it.
          Intentionally has NO onClick handler -- the only way out is the cross or Escape. */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-(--cl-dark-blue)/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-modal-title"
      >
        <div className="bg-(--cl-white) text-(--cl-dark-blue) rounded shadow-lg w-full max-w-lg p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-(--cl-dark-blue) hover:bg-(--cl-base) hover:text-(--cl-white) transition-colors focus:outline-none focus:ring-2 focus:ring-(--cl-accent-dark)"
          >
            ✕
          </button>

          <h2 id="task-edit-modal-title" className="mb-4 pr-8">
            Edit Task
          </h2>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 text-left"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="border border-(--cl-base) rounded p-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Status</span>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as typeof column)}
                className="border border-(--cl-base) rounded p-2"
              >
                {COLUMN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Due date</span>
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
                className="border border-(--cl-base) rounded p-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="border border-(--cl-base) rounded p-2 resize-none"
              />
            </label>

            {error && (
              <p className="text-(--cl-accent-dark) text-sm">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-(--cl-base) hover:bg-(--cl-base) hover:text-(--cl-white) transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-(--cl-accent-dark) text-(--cl-white) hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={pendingShift !== null}
        title="Shift the rest of the workflow too?"
        message={
          pendingShift
            ? `This due date moved ${shiftAmount} day${shiftAmount === 1 ? "" : "s"} ${shiftDirection}. ` +
              `${pendingShift.affectedCount} upcoming task${pendingShift.affectedCount === 1 ? "" : "s"} ` +
              `later in this workflow (not yet marked Done) can shift by the same amount to stay in sync.`
            : ""
        }
        confirmLabel={shifting ? "Shifting…" : "Shift following tasks"}
        cancelLabel="Just this task"
        onConfirm={handleConfirmShift}
        onCancel={handleDeclineShift}
      />
    </>
  );
}

export default TaskEditModal;
