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
import ConfirmDialog from "../components/ConfirmDialog";
import { useNavigate } from "react-router-dom";

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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<
    Record<WorkflowTask["column"], boolean>
  >({ todo: false, doing: false, done: false });

  const today = new Date();

  const navigate = useNavigate();

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
        console.log("Fetched deals:", data);
        console.log("Current dealId:", dealId);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dealId]);

  /**
   * Merge an updated task back into the board's local state.
   * Replaces the matching task by id, in place, without a refetch.
   */
  function handleTaskSaved(updatedTask: WorkflowTask) {
    //check if this task is the last task to be completed in the board, and if so, ask the user useing ConfirmDialog if they want to mark the deal as completed
    console.log("Checking if all tasks are done for board:", board);

    if (updatedTask.column === "done") {
      const allTasksDone = board?.workflow_tasks.every(
        (task) => task.column === "done" || task.id === updatedTask.id,
      );
      console.log("All tasks done check:", allTasksDone);
      if (allTasksDone) {
        // Ask user if they want to mark the deal as completed
        console.log(
          "All tasks completed. Prompting user to mark deal as completed.",
        );
        setConfirmDialogOpen(true);
      }
    }

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
    <>
      <div className="flex flex-col gap-4 p-4">
        {/* Use deal table's property_address field as Board header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="flex justify-between items-center col-span-2">
            <h1 className="text-2xl font-bold">{propertyAddress}</h1>
            <p className="text-sm text-(--cl-dark-blue)">
              {board.workflow_tasks.length} tasks
            </p>
          </div>
          <button
            onClick={() => {
              if (!dealId) {
                console.error("Cannot edit deal: dealId is missing.");
                return;
              }
              // Navigate to the deal edit page
              navigate(`/deals/${dealId}/edit`);
            }}
            className="bg-(--cl-accent-dark) text-(--cl-white) py-2 px-4 rounded"
          >
            Edit Deal
          </button>
        </div>
        {/* Column Headers */}
        <div className="sm:flex gap-4">
          {(["todo", "doing", "done"] as const).map((col) => (
            <div key={col} className="flex-1 bg-(--cl-base) rounded p-3 my-3">
              <h2 className="capitalize mb-2">{col}</h2>
              {/* Column Tasks */}
              {columns[col].map((task, taskIndex) => (
                <div
                  key={task.id}
                  className={
                    (task.due_date &&
                    new Date(task.due_date) < today &&
                    task.column !== "done"
                      ? "bg-(--cl-accent-dark) text-(--cl-white)"
                      : "bg-(--cl-white) text-(--cl-dark-blue)") +
                    " p-2 mb-2 rounded shadow hover:shadow-lg transition-shadow flex flex-col gap-1 cursor-pointer" +
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
                    className="md:hidden w-full rounded bg-(--cl-base-dark) p-2 text-(--cl-white) shadow hover:shadow-lg transition-shadow"
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
      <ConfirmDialog
        open={confirmDialogOpen}
        title="All tasks completed"
        message="All tasks for this deal are completed. Do you want to mark the deal as completed?"
        confirmLabel="Yes, mark as completed"
        cancelLabel="Cancel"
        destructive={false}
        onConfirm={() => {
          // Mark the deal as completed
          if (!dealId) {
            console.error("Cannot mark deal as completed: dealId is missing.");
            setConfirmDialogOpen(false);
            return;
          }

          console.log("Marking deal as completed:", dealId);
          supabase
            .from("deals")
            .update({ status: "closed" })
            .eq("id", dealId)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to mark deal as completed:", error);
              }
              setConfirmDialogOpen(false);
            });
          {
            /** RUNTIME ERROR: new row for relation \"deals\" violates check constraint \"deals_status_check\" */
          }
        }}
        onCancel={() => {
          // cancel the rest of the operation and just close the dialog
          console.log("User canceled marking deal as completed.");
          setConfirmDialogOpen(false);
          return;
        }}
      />
    </>
  );
}

export default Workflow;
