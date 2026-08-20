import { supabase } from "./supabaseClient";

//======================
// WORKFLOW BOARD / TASKS
//======================

export async function createWorkflowBoard(
  dealId: string,
  clientType: "seller" | "buyer" | "rental",
) {
  const { data, error } = await supabase.rpc("create_workflow_board", {
    p_deal_id: dealId,
    p_client_type: clientType,
  });

  if (error) throw error;
  return data; // the new board's id
}

/* Example usage of createWorkflowBoard() in your app flow:

When an agent finishes the "new deal" form (creating a row in deals), immediately follow it with this call, 
using the same client type they selected for the deal:

`const { data: deal, error: dealError } = await supabase
  .from("deals")
  .insert({ agent_id: userId, property_address, deal_type, etc... })
  .select()
  .single();

if (dealError) throw dealError;

const boardId = await createWorkflowBoard(deal.id, "seller"); // or "buyer" / "rental"`


At that point, workflow_boards has one new row, and workflow_tasks has 39 new rows (once your seller CSV is imported)
 — fully populated with titles, descriptions, and calculated due dates, ready for your kanban page to fetch and 
 render in todo/doing/done columns.

*/

//======================
// TYPES
//======================

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

//======================
// GET WORKFLOW BOARD BY DEAL-ID
//======================

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

//=====================
// GROUP TASKS BY COLUMN
//=====================

export function groupTasksByColumn(tasks: WorkflowTask[]) {
  return {
    todo: tasks.filter((t) => t.column === "todo"),
    doing: tasks.filter((t) => t.column === "doing"),
    done: tasks.filter((t) => t.column === "done"),
  };
}

//=====================
// MOVE TASK TO ANOTHER COLUMN
//=====================

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
