import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient"; // adjust to your actual client path

interface WorkflowTask {
  id: string;
  board_id: string;
  title: string;
  column: string;
  due_date: string | null;
  template_source_id: string | null;
  sort_order: number;
  created_at: string;
  description: string | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const MAX_TASKS_SHOWN = 10;

function formatDueDate(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / DAY_MS);

  if (diffDays === 0)
    return { label: "Due today", overdue: false, dueSoon: true };
  if (diffDays < 0)
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      overdue: true,
      dueSoon: false,
    };
  if (diffDays === 1)
    return { label: "Due tomorrow", overdue: false, dueSoon: true };
  return {
    label: `Due in ${diffDays}d`,
    overdue: false,
    dueSoon: diffDays <= 3,
  };
}

function WorkflowOverviewCard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUpcomingTasks() {
      setLoading(true);
      setError(null);

      // RLS scopes this to the signed-in agent's own boards
      // (or every board for admins), so no manual filter is needed here.
      const { data, error } = await supabase
        .from("workflow_tasks")
        .select(
          "id, board_id, title, column, due_date, template_source_id, sort_order, created_at, description",
        )
        .not("due_date", "is", null)
        .neq("column", "done")
        .order("due_date", { ascending: true })
        .limit(MAX_TASKS_SHOWN);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setTasks([]);
      } else {
        setTasks(data ?? []);
      }
      setLoading(false);
    }

    fetchUpcomingTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  function goToWorkflow() {
    navigate("/workflow");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToWorkflow();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToWorkflow}
      onKeyDown={handleKeyDown}
      aria-label="Go to workflow board"
      className="bg-(--cl-base) text-(--cl-dark-blue) p-4 rounded shadow-md w-full max-w-2xl text-left cursor-pointer transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-(--cl-accent-dark) overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-2">
        <h2>Upcoming Deadlines</h2>
        <span className="text-sm underline">View all boards →</span>
      </div>

      {loading && <p>Loading tasks...</p>}

      {!loading && error && (
        <p className="text-(--cl-accent-dark)">Couldn't load tasks: {error}</p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p>No upcoming deadlines. You're all caught up.</p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const due = formatDueDate(task.due_date as string);
            return (
              <li
                key={task.id}
                className="flex justify-between items-center bg-(--cl-white) rounded p-2"
              >
                <span className="truncate mr-2">{task.title}</span>
                <span
                  className={
                    due.overdue
                      ? "text-(--cl-accent-dark) font-semibold whitespace-nowrap"
                      : due.dueSoon
                        ? "text-(--cl-accent) font-semibold whitespace-nowrap"
                        : "whitespace-nowrap"
                  }
                >
                  {due.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default WorkflowOverviewCard;
