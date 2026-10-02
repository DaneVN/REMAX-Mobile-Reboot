/**
 * Shared board title logic used by WorkflowOverviewCard, DealProgressCard,
 * and WorkflowIndex — mirrors the rule in Workflow.tsx.
 */
export function getBoardTitle(
  representing: "seller" | "buyer" | "both",
  propertyAddress: string,
  firstBuyerName: string | null,
): string {
  if (representing === "buyer" && firstBuyerName) return firstBuyerName;
  return propertyAddress || "Unknown Address";
}
