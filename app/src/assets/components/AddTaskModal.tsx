import { useEffect, useState } from "react";
import {
  insertCustomTask,
  getTasksForPositioning,
  type WorkflowTask,
} from "../../lib/workflow";

interface AddTaskModalProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
  onTaskAdded: (task: WorkflowTask) => void;
  onSiblingShifted?: () => void;
}

function AddTaskModal({
  boardId,
  open,
  onClose,
  onTaskAdded,
  onSiblingShifted,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [stage, setStage] = useState(1);
  const [afterSortOrder, setAfterSortOrder] = useState<number | null>(null);

  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing tasks for positioning context
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    getTasksForPositioning(boardId)
      .then((data) => {
        if (cancelled) return;
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load tasks.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newTask = await insertCustomTask(
        boardId,
        title.trim(),
        description.trim() || null,
        dueDate || null,
        stage,
        afterSortOrder,
      );

      setTitle("");
      setDescription("");
      setDueDate("");
      setStage(1);
      setAfterSortOrder(null);

      onTaskAdded(newTask);
      onClose();
      onSiblingShifted?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create custom task.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  // The task that will come BEFORE the new one (selected position)
  const beforeTask = tasks.find((t) => t.sort_order === afterSortOrder);
  // The task that will come AFTER the new one
  const afterTask = tasks.find(
    (t) =>
      t.sort_order > (afterSortOrder ?? 0) &&
      !tasks.some(
        (x) =>
          x.sort_order > (afterSortOrder ?? 0) && x.sort_order < t.sort_order,
      ),
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-(--cl-white) text-(--cl-dark-blue) rounded shadow-lg p-6 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4">Add Custom Task</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              required
              className="border border-(--cl-base) rounded p-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={3}
              className="border border-(--cl-base) rounded p-2 resize-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border border-(--cl-base) rounded p-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(parseInt(e.target.value))}
              className="border border-(--cl-base) rounded p-2"
            >
              <option value={1}>Listing</option>
              <option value={2}>Offer</option>
              <option value={3}>Sale</option>
              <option value={4}>Suspensive Conditions</option>
              <option value={5}>Lodging</option>
              <option value={6}>Registration</option>
              <option value={7}>Post-Transaction</option>
            </select>
          </label>

          {/* Position picker with context */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Insert Position</span>
            {!loading ? (
              <select
                value={afterSortOrder ?? ""}
                onChange={(e) =>
                  setAfterSortOrder(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
                className="border border-(--cl-base) rounded p-2"
              >
                <option value="">At the end</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.sort_order}>
                    After: {t.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <p>Loading tasks</p>
                <img src="/blocks-shuffle-3.svg" alt="" className="w-6 h-6" />
              </div>
            )}
          </label>

          {/* Visual context: show the sandwich */}
          {afterSortOrder !== null && (
            <div className="bg-(--cl-base)/20 rounded p-3 text-sm">
              <p className="text-(--cl-dark-blue)/70 mb-2">
                This task will appear:
              </p>
              {beforeTask && (
                <p className="mb-1">
                  <span className="font-semibold">After:</span>{" "}
                  {beforeTask.title}
                </p>
              )}
              <p className="text-center my-2 text-(--cl-accent-dark) font-semibold">
                ↓ NEW TASK ↓
              </p>
              {afterTask && (
                <p className="mt-1">
                  <span className="font-semibold">Before:</span>{" "}
                  {afterTask.title}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-(--cl-base) hover:bg-(--cl-base)"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-(--cl-accent-dark) text-(--cl-white) disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTaskModal;
