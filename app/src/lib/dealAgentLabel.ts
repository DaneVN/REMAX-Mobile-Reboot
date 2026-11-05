// Helpers for the `deal_agents ( agent_id, profiles ( full_name ) )` embed
// used on list screens so admins can see which agent owns each deal.
//
// Note: for a normal agent, RLS only exposes their OWN profiles row, so
// co-agents' names come back null in this embed. These labels are therefore
// only shown to admins (who can read every profile).

export type DealAgentEmbed = {
  agent_id: string;
  profiles: { full_name: string | null } | null;
};

export const DEAL_AGENTS_EMBED =
  "deal_agents ( agent_id, profiles ( full_name ) )";

export function agentNamesLabel(
  agents: DealAgentEmbed[] | null | undefined,
): string {
  const names = (agents ?? []).map((a) => a.profiles?.full_name ?? "(unnamed)");
  return names.length > 0 ? names.join(", ") : "Unassigned";
}

export function isAssignedTo(
  agents: DealAgentEmbed[] | null | undefined,
  userId: string | undefined,
): boolean {
  return !!userId && (agents ?? []).some((a) => a.agent_id === userId);
}
