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
import AddTaskModal from "../components/AddTaskModal";
import { deleteTask } from "../../lib/workflow";

type DealSummary = {
  id: string;
  property_address: string;
  deal_type: string;
  status: string;
  representing: "seller" | "buyer" | "both";
};

function Workflow() {
  const { dealId } = useParams<{ dealId: string }>();
  const [board, setBoard] = useState<WorkflowBoard | null>(null);
  const [deal, setDeal] = useState<DealSummary | null>(null);
  const [firstBuyerName, setFirstBuyerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<
    Record<WorkflowTask["column"], boolean>
  >({ todo: false, doing: false, done: false });

  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const today = new Date();

  const navigate = useNavigate();

  function showMoreTasks(column: WorkflowTask["column"]) {
    setExpandedColumns((current) => ({
      ...current,
      [column]: !current[column],
    }));
  }

  // ── Load board ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dealId) return;
    getWorkflowBoardByDeal(dealId)
      .then(setBoard)
      .finally(() => setLoading(false));
  }, [dealId]);

  // ── Load deal (representing + property_address) ────────────────────────────
  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    supabase
      .from("deals")
      .select("id, property_address, deal_type, status, representing")
      .eq("id", dealId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) {
          console.error("Failed to fetch deals:", error);
          return;
        }
        setDeal(data as DealSummary);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dealId]);

  // ── Load first buyer's name when representing is buyer or both ─────────────
  useEffect(() => {
    if (!dealId || !deal) return;
    if (deal.representing === "seller") return; // property address used — no need

    let cancelled = false;

    supabase
      .from("deal_clients")
      .select("clients(name)")
      .eq("deal_id", dealId)
      .eq("role", "buyer")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const name =
          (data as { clients: { name: string } | null }).clients?.name ?? null;
        setFirstBuyerName(name);
      });

    return () => {
      cancelled = true;
    };
  }, [dealId, deal]);

  // ── Board title logic ──────────────────────────────────────────────────────
  // seller → property address
  // buyer  → first buyer's name (fallback: property address)
  // both   → property address (board originated as a seller deal)
  function getBoardTitle(): string {
    if (!deal) return "Loading…";
    if (deal.representing === "buyer" && firstBuyerName) return firstBuyerName;
    return deal.property_address || "Unknown Address";
  }

  // ── Task saved handler ─────────────────────────────────────────────────────
  function handleTaskSaved(updatedTask: WorkflowTask) {
    //check if this task is the last task to be completed in the board, and if so, ask the user useing ConfirmDialog if they want to mark the deal as completed

    if (updatedTask.column === "done") {
      const allTasksDone = board?.workflow_tasks.every(
        (task) => task.column === "done" || task.id === updatedTask.id,
      );
      if (allTasksDone) {
        // Ask user if they want to mark the deal as completed
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

  if (loading)
    return (
      <>
        <p>Loading board…</p>{" "}
        <img src="/blocks-shuffle-3.svg" alt="" className="w-6 h-6" />
      </>
    );
  if (!board) return <p>No workflow board found for this deal yet.</p>;

  const columns = groupTasksByColumn(board.workflow_tasks);

  function handleTaskAdded(newTask: WorkflowTask) {
    // Add to the board's task list
    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        workflow_tasks: [...current.workflow_tasks, newTask].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      };
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        {/* Use deal table's property_address field as Board header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="flex justify-between items-center col-span-2">
            <h1 className="text-2xl font-bold">{getBoardTitle()}</h1>

            {/* Representing indicator */}
            {deal && deal.representing !== "seller" && (
              <p className="text-sm text-(--cl-dark-blue)/60 capitalize -mt-2">
                Representing: {deal.representing}
              </p>
            )}
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
          {/* Add task button in footer */}
          <button
            onClick={() => setAddTaskOpen(true)}
            className="bg-(--cl-base-dark) text-(--cl-white) px-4 py-2 rounded"
          >
            + Add Custom Task
          </button>

          <AddTaskModal
            boardId={board?.id || ""}
            open={addTaskOpen}
            onClose={() => setAddTaskOpen(false)}
            onTaskAdded={handleTaskAdded}
            onSiblingShifted={() => {
              // if task edit is saved, reload page
              window.location.reload();
            }}
          />
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
            onDeleted={deleteTask}
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

          supabase
            .from("deals")
            .update({ status: "closed" })
            .eq("id", dealId)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to mark deal as completed:", error);
              }
              setConfirmDialogOpen(false);
              navigate("/workflow");
            });
        }}
        onCancel={() => {
          // cancel the rest of the operation and just close the dialog
          setConfirmDialogOpen(false);
          return;
        }}
      />
    </>
  );
}

export default Workflow;
