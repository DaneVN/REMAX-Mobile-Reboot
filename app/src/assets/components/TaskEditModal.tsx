import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient"; // adjust to your actual client path
import type { WorkflowTask } from "../../lib/workflow"; // adjust to your actual types path

interface TaskEditModalProps {
  task: WorkflowTask;
  onClose: () => void;
  onSaved: (updatedTask: WorkflowTask) => void;
}

const COLUMN_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];

function TaskEditModal({ task, onClose, onSaved }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [column, setColumn] = useState(task.column);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock background scroll while the modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Allow Escape to close, same as clicking the cross
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("workflow_tasks")
      .update({
        title,
        column,
        due_date: dueDate === "" ? null : dueDate,
        description: description === "" ? null : description,
      })
      .eq("id", task.id)
      .select(
        "id, board_id, title, column, due_date, template_source_id, sort_order, created_at, description",
      )
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved(data as WorkflowTask);
    onClose();
  }

  return (
    // Backdrop: covers the whole screen, blurs and dims everything behind it.
    // Intentionally has NO onClick handler — the only way out is the cross or Escape.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
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

          {error && <p className="text-(--cl-accent-dark) text-sm">{error}</p>}

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
  );
}

export default TaskEditModal;
