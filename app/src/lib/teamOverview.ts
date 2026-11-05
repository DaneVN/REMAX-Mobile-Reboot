import { supabase } from "./supabaseClient";

// Admin-only data for the Team overview page. RLS ("admins see all ...")
// is what actually lets this query return every agent's deals; for a normal
// agent it would only return their own, so the page is also route-guarded.

export type AgentOverview = {
  agentId: string;
  fullName: string;
  active: number;
  closed: number;
  fellThrough: number;
  overdueTasks: number; // open tasks past their due date on ACTIVE deals
  activeSalesValue: number; // agreed purchase price of active deals x agent's internal split
};

type DealRow = {
  status: string;
  purchase_price: number | null;
  deal_agents: {
    agent_id: string;
    commission_split_pct: number;
    profiles: { full_name: string | null } | null;
  }[];
  workflow_boards: {
    workflow_tasks: { due_date: string | null; column: string }[];
  }[];
};

// Local-date "YYYY-MM-DD" -- due dates are plain dates, so comparing as
// strings avoids timezone drift.
function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export async function getTeamOverview(): Promise<AgentOverview[]> {
  const [dealsRes, agentsRes] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `status, purchase_price,
        deal_agents ( agent_id, commission_split_pct, profiles ( full_name ) ),
        workflow_boards ( workflow_tasks ( due_date, column ) )`,
      )
      .eq("is_deleted", false),
    supabase.from("profiles").select("id, full_name").eq("role", "agent"),
  ]);

  if (dealsRes.error) throw dealsRes.error;
  if (agentsRes.error) throw agentsRes.error;

  const today = todayISO();
  const byAgent = new Map<string, AgentOverview>();

  const blank = (agentId: string, fullName: string): AgentOverview => ({
    agentId,
    fullName,
    active: 0,
    closed: 0,
    fellThrough: 0,
    overdueTasks: 0,
    activeSalesValue: 0,
  });

  // Seed with every agent so someone with no deals still shows up as zeros.
  for (const a of agentsRes.data ?? []) {
    byAgent.set(a.id, blank(a.id, a.full_name ?? "(unnamed)"));
  }

  for (const deal of (dealsRes.data ?? []) as unknown as DealRow[]) {
    const openOverdue = deal.workflow_boards
      .flatMap((b) => b.workflow_tasks)
      .filter(
        (t) => t.due_date && t.column !== "done" && t.due_date < today,
      ).length;

    // A shared deal counts once for each agent on it.
    for (const da of deal.deal_agents) {
      const row =
        byAgent.get(da.agent_id) ??
        blank(da.agent_id, da.profiles?.full_name ?? "(unnamed)");
      byAgent.set(da.agent_id, row);

      if (deal.status === "active") {
        row.active += 1;
        row.overdueTasks += openOverdue;
        row.activeSalesValue +=
          ((deal.purchase_price ?? 0) * da.commission_split_pct) / 100;
      } else if (deal.status === "closed") {
        row.closed += 1;
      } else if (deal.status === "fell_through") {
        row.fellThrough += 1;
      }
    }
  }

  return [...byAgent.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}
