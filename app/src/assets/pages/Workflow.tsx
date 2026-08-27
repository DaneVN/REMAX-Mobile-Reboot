import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getWorkflowBoardByDeal,
  groupTasksByColumn,
  type WorkflowBoard,
} from "../../lib/workflow";
import { supabase } from "../../lib/supabaseClient";

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

  const today = new Date();

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
            {columns[col].map((task) => (
              <div
                key={task.id}
                className={
                  (task.due_date &&
                  new Date(task.due_date) < today &&
                  task.column !== "done"
                    ? "bg-(--cl-accent)"
                    : "bg-(--cl-white)") +
                  " text-(--cl-dark-blue) p-2 mb-2 rounded shadow hover:shadow-lg transition-shadow"
                }
              >
                <h3 className="font-medium">{task.title}</h3>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default Workflow;
