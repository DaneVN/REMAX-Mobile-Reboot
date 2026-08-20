import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getWorkflowBoardByDeal,
  groupTasksByColumn,
  type WorkflowBoard,
} from "../../lib/workflow";

function Workflow() {
  const { dealId } = useParams<{ dealId: string }>();
  const [board, setBoard] = useState<WorkflowBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;
    getWorkflowBoardByDeal(dealId)
      .then(setBoard)
      .finally(() => setLoading(false));
  }, [dealId]);

  if (loading) return <p>Loading board…</p>;
  if (!board) return <p>No workflow board found for this deal yet.</p>;

  const columns = groupTasksByColumn(board.workflow_tasks);

  return (
    <div className="flex gap-4 p-4">
      {(["todo", "doing", "done"] as const).map((col) => (
        <div key={col} className="flex-1 bg-(--cl-base) rounded p-3">
          <h2 className="capitalize mb-2">{col}</h2>
          {columns[col].map((task) => (
            <div
              key={task.id}
              className="bg-(--cl-white) rounded shadow p-2 mb-2"
            >
              <p className="font-medium">{task.title}</p>
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
  );
}

export default Workflow;
