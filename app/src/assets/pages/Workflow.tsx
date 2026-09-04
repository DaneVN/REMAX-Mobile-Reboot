import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getWorkflowBoardByDeal,
  groupTasksByColumn,
  type WorkflowBoard,
  type WorkflowTask,
} from "../../lib/workflow";
import { supabase } from "../../lib/supabaseClient";
import TaskEditModal from "../components/TaskEditModal";

function Workflow() {
  const { dealId } = useParams<{ dealId: string }>();
  const [board, setBoard] = useState<WorkflowBoard | null>(null);
  const [deals, setDeals] = useState<
    {
      id: string;
      property_address: string;
      deal_type: string;
      status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<
    Record<WorkflowTask["column"], boolean>
  >({ todo: false, doing: false, done: false });

  const today = new Date();

  function showMoreTasks(column: WorkflowTask["column"]) {
    //toggle expanded state based on if the column is already expanded or not
    if (expandedColumns[column]) {
      setExpandedColumns((current) => ({ ...current, [column]: false }));
    } else {
      setExpandedColumns((current) => ({ ...current, [column]: true }));
    }
  }

  /** Fetch workflow board for the given dealId */
  useEffect(() => {
    if (!dealId) return;
    getWorkflowBoardByDeal(dealId)
      .then(setBoard)
      .finally(() => setLoading(false));
  }, [dealId]);

  /** Fetch active deals */
  useEffect(() => {
    let cancelled = false;

    supabase
      .from("deals")
      .select("id, property_address, deal_type, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch deals:", error);
        }
        setDeals(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Merge an updated task back into the board's local state.
   * Replaces the matching task by id, in place, without a refetch.
   */
  function handleTaskSaved(updatedTask: WorkflowTask) {
    setBoard((currentBoard) => {
      if (!currentBoard) return currentBoard;

      return {
        ...currentBoard,
        workflow_tasks: currentBoard.workflow_tasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      };
    });
  }

  /** Get the property address for the current deal */
  const currentDeal = deals?.find((deal) => deal.id === dealId);
  const propertyAddress = currentDeal?.property_address || "Unknown Address";

  if (loading) return <p>Loading board…</p>;
  if (!board) return <p>No workflow board found for this deal yet.</p>;

  const columns = groupTasksByColumn(board.workflow_tasks);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Use deal table's property_address field as Board header */}
      <h1 className="text-2xl font-bold">{propertyAddress}</h1>

      {/* Column Headers */}
      <div className="sm:flex gap-4">
        {(["todo", "doing", "done"] as const).map((col) => (
          <div key={col} className="flex-1 bg-(--cl-base) rounded p-3">
            <h2 className="capitalize mb-2">{col}</h2>
            {/* Column Tasks */}
            {columns[col].map((task, taskIndex) => (
              <div
                key={task.id}
                className={
                  (task.due_date &&
                  new Date(task.due_date) < today &&
                  task.column !== "done"
                    ? "bg-(--cl-accent)"
                    : "bg-(--cl-white)") +
                  " text-(--cl-dark-blue) p-2 mb-2 rounded shadow hover:shadow-lg transition-shadow flex flex-col gap-1 cursor-pointer" +
                  (taskIndex >= 3 && !expandedColumns[col]
                    ? " hidden md:flex"
                    : "")
                }
                onClick={() => setSelectedTask(task)}
              >
                <div>
                  <strong>{task.title}</strong>
                </div>
                {task.description && (
                  <p className="text-sm text-(--cl-dark-blue)">
                    {task.description}
                  </p>
                )}
                {task.due_date && (
                  <p className="text-sm text-(--cl-dark-blue)">
                    Due: {task.due_date}
                  </p>
                )}
              </div>
            ))}
            {
              //if there are less than 3 tasks in the column, the button is hidden
              columns[col].length > 3 && (
                <button
                  type="button"
                  className="md:hidden w-full rounded bg-(--cl-white) p-2 text-(--cl-dark-blue) shadow hover:shadow-lg transition-shadow"
                  onClick={() => showMoreTasks(col)}
                >
                  {
                    // Toggle between showing more or less tasks based on the current state.
                    columns[col].length > 3 && !expandedColumns[col]
                      ? "Show more"
                      : "Show less"
                  }
                </button>
              )
            }
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          boardId={board.id}
          onClose={() => setSelectedTask(null)}
          onSiblingsShifted={() => {
            // if task edit is saved, reload page
            window.location.reload();
          }}
          onSaved={(updatedTask) => {
            handleTaskSaved(updatedTask);
          }}
        />
      )}
    </div>
  );
}

export default Workflow;
