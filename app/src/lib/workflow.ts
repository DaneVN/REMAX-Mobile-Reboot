import { supabase } from "./supabaseClient";

export type WorkflowTask = {
  id: string;
  title: string;
  description: string | null;
  column: "todo" | "doing" | "done";
  due_date: string | null;
  sort_order: number;
};

export type WorkflowBoard = {
  id: string;
  deal_id: string;
  client_type: "seller" | "buyer" | "rental";
  workflow_tasks: WorkflowTask[];
};

// Note: createWorkflowBoard() used to live here, calling the standalone
// create_workflow_board RPC. That function was superseded by the atomic
// create_deal_with_board RPC (see deals.ts -> createDealWithBoard), which
// creates the deal, board, and tasks together in one transaction. Since
// create_workflow_board was never (re)created in the database after that
// change, it no longer exists -- removed here rather than left as dead,
// now-broken code. If a future feature needs to add a *second* board to an
// existing deal (e.g. a double-mandate deal representing both sides), that
// would need its own dedicated function -- ask if that comes up.

export async function getWorkflowBoardByDeal(
  dealId: string,
): Promise<WorkflowBoard | null> {
  const { data, error } = await supabase
    .from("workflow_boards")
    .select(
      `
      id,
      deal_id,
      client_type,
      workflow_tasks (
        id, title, description, column, due_date, sort_order
      )
    `,
    )
    .eq("deal_id", dealId)
    .order("sort_order", { referencedTable: "workflow_tasks" })
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no board found for this deal yet
    throw error;
  }

  return data as WorkflowBoard;
}

export function groupTasksByColumn(tasks: WorkflowTask[]) {
  return {
    todo: tasks.filter((t) => t.column === "todo"),
    doing: tasks.filter((t) => t.column === "doing"),
    done: tasks.filter((t) => t.column === "done"),
  };
}

export async function moveTask(
  taskId: string,
  newColumn: "todo" | "doing" | "done",
) {
  const { error } = await supabase
    .from("workflow_tasks")
    .update({ column: newColumn })
    .eq("id", taskId);

  if (error) throw error;
}
