import { supabase } from "./supabaseClient";

export type DealAgent = {
  id: string; // deal_agents row id
  agentId: string;
  fullName: string;
  commissionSplitPct: number;
};

export type AgentDirectoryEntry = {
  id: string;
  fullName: string;
};

// ---------------------------------------------------------------------------
// The office-wide agent picker list -- for choosing who to add to a deal.
// Reads the `agent_directory` view (id + full_name ONLY). The profiles table
// itself is no longer readable by other agents, so role / default attorney
// of colleagues stay private.
// ---------------------------------------------------------------------------
export async function listAllAgents(): Promise<AgentDirectoryEntry[]> {
  const { data, error } = await supabase
    .from("agent_directory")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).flatMap((row) =>
    row.id ? [{ id: row.id, fullName: row.full_name ?? "(unnamed)" }] : [],
  );
}

// ---------------------------------------------------------------------------
// Agents currently assigned to a deal, with their internal commission split.
// Names come from the agent_directory view rather than a profiles embed,
// because RLS hides colleagues' profiles rows from agents.
// ---------------------------------------------------------------------------
export async function getDealAgents(dealId: string): Promise<DealAgent[]> {
  const { data, error } = await supabase
    .from("deal_agents")
    .select("id, agent_id, commission_split_pct")
    .eq("deal_id", dealId);

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: names, error: namesError } = await supabase
    .from("agent_directory")
    .select("id, full_name")
    .in(
      "id",
      rows.map((r) => r.agent_id),
    );

  if (namesError) throw namesError;

  const nameById = new Map(
    (names ?? []).flatMap((n) => (n.id ? [[n.id, n.full_name] as const] : [])),
  );

  return rows.map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    fullName: nameById.get(row.agent_id) ?? "(unnamed)",
    commissionSplitPct: row.commission_split_pct,
  }));
}

// ---------------------------------------------------------------------------
// Add another agent to an existing deal.
// RLS ("agents manage deal_agents on their deals") requires the CALLER to
// already be assigned to this deal -- an agent can't add themselves to
// someone else's deal uninvited. Admins are read-only on other agents' deals.
// ---------------------------------------------------------------------------
export async function addAgentToDeal(
  dealId: string,
  agentId: string,
  commissionSplitPct: number,
) {
  const { error } = await supabase.from("deal_agents").insert({
    deal_id: dealId,
    agent_id: agentId,
    commission_split_pct: commissionSplitPct,
  });

  if (error) throw error;
}

export async function updateAgentSplit(
  dealAgentRowId: string,
  commissionSplitPct: number,
) {
  const { error } = await supabase
    .from("deal_agents")
    .update({ commission_split_pct: commissionSplitPct })
    .eq("id", dealAgentRowId);

  if (error) throw error;
}

export async function removeAgentFromDeal(dealAgentRowId: string) {
  const { error } = await supabase
    .from("deal_agents")
    .delete()
    .eq("id", dealAgentRowId);

  if (error) throw error;
}
