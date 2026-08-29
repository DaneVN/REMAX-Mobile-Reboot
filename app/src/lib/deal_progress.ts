import { supabase } from "./supabaseClient";

export type DealProgress = {
  dealId: string;
  propertyAddress: string;
  currentStage: number; // 1-7
};

/**
 * For each of the logged-in agent's active deals, returns the highest
 * stage (1-7) that has at least one completed task on that deal's board.
 * RLS scopes this to the current agent automatically -- no manual filter needed.
 */
export async function getActiveDealsProgress(): Promise<DealProgress[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      property_address,
      workflow_boards (
        workflow_tasks ( stage, column )
      )
    `,
    )
    .eq("status", "active");

  if (error) throw error;

  return (data ?? []).map((deal) => {
    const tasks = deal.workflow_boards?.flatMap((b) => b.workflow_tasks) ?? [];
    const doneStages = tasks
      .filter((t) => t.column === "done")
      .map((t) => t.stage);
    const currentStage = doneStages.length > 0 ? Math.max(...doneStages) : 1;

    return {
      dealId: deal.id,
      propertyAddress: deal.property_address,
      currentStage,
    };
  });
}
