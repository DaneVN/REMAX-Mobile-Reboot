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
// Relies on the "authenticated users see the agent directory" policy.
// ---------------------------------------------------------------------------
export async function listAllAgents(): Promise<AgentDirectoryEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name ?? "(unnamed)",
  }));
}

// ---------------------------------------------------------------------------
// Agents currently assigned to a deal, with their internal commission split.
// ---------------------------------------------------------------------------
export async function getDealAgents(dealId: string): Promise<DealAgent[]> {
  const { data, error } = await supabase
    .from("deal_agents")
    .select(
      `
      id,
      agent_id,
      commission_split_pct,
      profiles ( full_name )
    `,
    )
    .eq("deal_id", dealId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    fullName: row.profiles?.full_name ?? "(unnamed)",
    commissionSplitPct: row.commission_split_pct,
  }));
}

// ---------------------------------------------------------------------------
// Add another agent to an existing deal.
// RLS ("agents manage deal_agents on their deals") requires the CALLER to
// already be assigned to this deal (or be admin) -- an agent can't add
// themselves to someone else's deal uninvited.
// ---------------------------------------------------------------------------
export async function addAgentToDeal(
  dealId: string,
  agentId: string,
  commissionSplitPct: number,
) {
  const { error } = await supabase
    .from("deal_agents")
    .insert({
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
