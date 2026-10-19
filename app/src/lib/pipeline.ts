import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineClient = {
  name: string;
  role: "seller" | "buyer";
};

export type PipelineDeal = {
  id: string;
  propertyAddress: string;
  listingDate: string | null; // ISO date — deals.created_at
  expectedCloseDate: string | null; // proxy for Sale Date — deals.expected_close_date
  purchasePrice: number | null;
  listingPrice: number | null;
  expectedCommissionPct: number | null; // % excl. VAT
  // Two separate splits can reduce what reaches this agent:
  internalSplitPct: number; // deal_agents.commission_split_pct — split with the OTHER
  // Unity agent working this deal with you (default 100 = sole agent)
  externalSplitPct: number; // deals.commission_split_pct — split between Unity (office)
  // and an EXTERNAL agency's agent on this deal (default 100 =
  // no external agent, Unity keeps the full commission)
  combinedAgentSplitPct: number; // internalSplitPct × externalSplitPct / 100 — the effective
  // % of the deal's total commission that reaches this agent,
  // BEFORE the Unity office split (royalty/unitySplit) is applied
  currentStage: number; // 1-7
  agentFullName: string | null;
  listingCompany: string; // always "RE/MAX Unity" for now
  clients: PipelineClient[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function derivedStage(
  tasks: { column: string; stage: number | null }[],
): number {
  const doneStages = tasks
    .filter((t) => t.column === "done" && t.stage != null)
    .map((t) => Number(t.stage));
  return doneStages.length > 0 ? Math.max(...doneStages) : 1;
}

// ---------------------------------------------------------------------------
// Query — active deals at Stage 3 (Sale) or higher, scoped to current agent
// ---------------------------------------------------------------------------

export async function getPipelineDeals(): Promise<PipelineDeal[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      id,
      property_address,
      created_at,
      expected_close_date,
      purchase_price,
      listing_price,
      expected_commission,
      commission_split_pct,
      deal_agents (
        agent_id,
        commission_split_pct,
        profiles ( full_name )
      ),
      deal_clients (
        role,
        clients ( name )
      ),
      workflow_boards (
        workflow_tasks ( column, stage )
      )
    `,
    )
    .eq("status", "active")
    .eq("is_deleted", false);

  if (error) throw error;

  const results: PipelineDeal[] = [];

  for (const deal of data ?? []) {
    const tasks =
      (
        deal.workflow_boards as
          | {
              workflow_tasks?:
                | { column: string; stage: number | null }[]
                | null;
            }[]
          | null
      )?.flatMap((board) => board.workflow_tasks ?? []) ?? [];

    const stage = derivedStage(tasks);
    if (stage < 3) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myAgentRow = (deal.deal_agents as any[])?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.agent_id === user.id,
    );

    const internalSplitPct = myAgentRow?.commission_split_pct ?? 100;
    const externalSplitPct = deal.commission_split_pct ?? 100;
    const combinedAgentSplitPct = (internalSplitPct * externalSplitPct) / 100;

    results.push({
      id: deal.id,
      propertyAddress: deal.property_address ?? "",
      listingDate: deal.created_at ? deal.created_at.split("T")[0] : null,
      expectedCloseDate: deal.expected_close_date ?? null,
      purchasePrice: deal.purchase_price ?? null,
      listingPrice: deal.listing_price ?? null,
      expectedCommissionPct: deal.expected_commission ?? null,
      internalSplitPct,
      externalSplitPct,
      combinedAgentSplitPct,
      currentStage: stage,
      agentFullName: myAgentRow?.profiles?.full_name ?? null,
      listingCompany: "RE/MAX Unity",
      clients:
        (
          deal.deal_clients as
            | { role: string; clients: { name: string | null } | null }[]
            | null
        )?.map((dc) => ({
          name: dc.clients?.name ?? "(unnamed)",
          role: dc.role as "seller" | "buyer",
        })) ?? [],
    });
  }

  return results;
}
