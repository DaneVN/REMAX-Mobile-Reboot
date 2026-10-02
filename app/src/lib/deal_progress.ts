import { supabase } from "./supabaseClient";

export type DealProgress = {
  dealId: string;
  propertyAddress: string;
  representing: "seller" | "buyer" | "both";
  firstBuyerName: string | null;
  currentStage: number;
};

export async function getActiveDealsProgress(): Promise<DealProgress[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      property_address,
      representing,
      deal_clients ( role, clients ( name ) ),
      workflow_boards (
        workflow_tasks ( stage, column )
      )
    `,
    )
    .eq("status", "active")
    .eq("is_deleted", false);

  if (error) throw error;

  return (data ?? []).map((deal) => {
    const tasks = deal.workflow_boards?.flatMap((b) => b.workflow_tasks) ?? [];
    const doneStages = tasks
      .filter((t) => t.column === "done")
      .map((t) => t.stage);
    const currentStage = doneStages.length > 0 ? Math.max(...doneStages) : 1;

    const firstBuyer = (deal.deal_clients ?? [])
      .filter((dc) => dc.role === "buyer")
      .sort()[0];

    const firstBuyerName =
      (firstBuyer?.clients as { name: string } | null)?.name ?? null;

    return {
      dealId: deal.id,
      propertyAddress: deal.property_address,
      representing: (deal.representing ?? "seller") as
        | "seller"
        | "buyer"
        | "both",
      firstBuyerName,
      currentStage,
    };
  });
}
