import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { archiveDeal } from "../../lib/deals";
import { getBoardTitle } from "../../lib/boardTitle";
import { useAuth } from "../../lib/AuthProvider";
import { useUserRole } from "../../lib/useUserRole";
import {
  DEAL_AGENTS_EMBED,
  agentNamesLabel,
  isAssignedTo,
  type DealAgentEmbed,
} from "../../lib/dealAgentLabel";

type StatusTab = "active" | "closed" | "fell_through";

const TABS: { value: StatusTab; label: string; empty: string }[] = [
  { value: "active", label: "Active", empty: "No active deals yet." },
  { value: "closed", label: "Closed", empty: "No closed deals yet." },
  {
    value: "fell_through",
    label: "Fell through",
    empty: "No deals have fallen through.",
  },
];

function parseTab(value: string | null): StatusTab {
  return TABS.some((t) => t.value === value) ? (value as StatusTab) : "active";
}

type DealSummary = {
  id: string;
  property_address: string;
  deal_type: "sale" | "rental";
  status: string;
  hasOverdueTask: boolean;
  representing: "seller" | "buyer" | "both";
  firstBuyerName: string | null;
  agentNames: string;
  // True when the signed-in user is assigned to this deal. Admins are
  // read-only on other agents' deals, so Edit / Remove are hidden unless this
  // is true.
  isMine: boolean;
};

// Raw shape as it comes back from the nested select, before we collapse it
// down to the flat `hasOverdueTask` boolean used for display.
type DealRow = {
  id: string;
  property_address: string;
  deal_type: string;
  status: string;
  representing: string;
  deal_clients: { role: string; clients: { name: string } | null }[];
  deal_agents: DealAgentEmbed[];
  workflow_boards: {
    workflow_tasks: {
      due_date: string | null;
      column: string;
    }[];
  }[];
};

function isTaskOverdue(dueDate: string | null, column: string): boolean {
  if (!dueDate || column === "done") return false;

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

function WorkflowIndex() {
  const { session } = useAuth();
  const { isAdmin } = useUserRole();
  const userId = session?.user.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseTab(searchParams.get("status"));
  const tab = TABS.find((t) => t.value === status) ?? TABS[0];

  // Results are stored together with the status they were fetched for, so
  // "loading" is simply "the data on screen is for a different tab" -- no
  // synchronous setState needed inside the effect when the tab changes.
  const [result, setResult] = useState<{
    status: StatusTab;
    deals: DealSummary[];
    loadError: string | null;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loading = result?.status !== status;
  const deals = result?.status === status ? result.deals : [];

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("deals")
      .select(
        `id, property_address, deal_type, status, representing,
        deal_clients ( role, clients ( name ) ),
        ${DEAL_AGENTS_EMBED},
        workflow_boards ( workflow_tasks ( due_date, column ) )`,
      )
      .eq("status", status)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return; // unmounted or tab changed before the request resolved

        if (error) console.error("Failed to fetch deals:", error);

        const rows = (data ?? []) as unknown as DealRow[];
        const summaries: DealSummary[] = rows.map((row) => {
          const allTasks = row.workflow_boards.flatMap((b) => b.workflow_tasks);
          const firstBuyerName =
            (row.deal_clients ?? []).filter((dc) => dc.role === "buyer")[0]
              ?.clients?.name ?? null;

          return {
            id: row.id,
            property_address: row.property_address,
            deal_type: row.deal_type as "sale" | "rental",
            status: row.status,
            // Leftover open tasks on a closed / fell-through deal aren't
            // "overdue" in any useful sense, so only flag active deals.
            hasOverdueTask:
              status === "active" &&
              allTasks.some((t) => isTaskOverdue(t.due_date, t.column)),
            representing: (row.representing ?? "seller") as
              "seller" | "buyer" | "both",
            firstBuyerName,
            agentNames: agentNamesLabel(row.deal_agents),
            isMine: isAssignedTo(row.deal_agents, userId),
          };
        });

        setResult({
          status,
          deals: summaries,
          loadError: error ? "Couldn't load your deals." : null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  async function handleArchive(dealId: string) {
    setActionError(null);
    try {
      await archiveDeal(dealId);
      setResult((prev) =>
        prev
          ? { ...prev, deals: prev.deals.filter((d) => d.id !== dealId) }
          : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove deal.",
      );
    }
  }

  function selectTab(next: StatusTab) {
    // "active" is the default, so keep its URL clean.
    setSearchParams(next === "active" ? {} : { status: next });
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1>
        {isAdmin ? "All agents' " : "Your "}
        {tab.label.toLowerCase()} files
      </h1>
      <div className="flex gap-3 justify-center">
        <Link
          to="/deals/new"
          className="bg-(--cl-base-dark) text-(--cl-white) px-4 py-2 rounded"
        >
          + New Deal
        </Link>
        <Link
          to="/deals/archived"
          className="border bg-(--cl-accent-dark) text-(--cl-white) px-4 py-2 rounded"
        >
          View Archived
        </Link>
      </div>

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Deal status"
        className="flex self-center rounded overflow-hidden border border-(--cl-base) text-sm font-medium"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            onClick={() => selectTab(t.value)}
            className={`px-4 py-2 transition-colors ${
              status === t.value
                ? "bg-(--cl-base-dark) text-(--cl-white)"
                : "bg-white text-(--cl-base-dark) hover:bg-(--cl-base) hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3">
          <p>Loading boards</p>
          <img
            src="/blocks-shuffle-3.svg"
            alt="Loading..."
            className="w-6 h-6"
          />
        </div>
      ) : (
        <>
          {(actionError ?? result?.loadError) && (
            <p className="text-red-700">{actionError ?? result?.loadError}</p>
          )}
          {deals.length === 0 && <p>{tab.empty}</p>}

          {deals.map((deal) => (
            <div
              key={deal.id}
              className={`p-4 rounded shadow-md flex justify-between items-center ${
                deal.hasOverdueTask
                  ? "bg-(--cl-accent-dark) text-(--cl-white) animate-pulse"
                  : "bg-(--cl-white) text-(--cl-dark-blue)"
              }`}
            >
              <Link to={`/workflow/${deal.id}`} className="flex-1">
                <p className="font-medium">
                  {getBoardTitle(
                    deal.representing,
                    deal.property_address,
                    deal.firstBuyerName,
                  )}
                </p>
                <p className="text-sm capitalize">
                  {deal.deal_type} · {deal.status.replace("_", " ")}
                  {deal.hasOverdueTask && (
                    <span className="ml-2 font-semibold">⚠ Overdue task</span>
                  )}
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    <span className="font-semibold">Agent:</span>{" "}
                    {deal.agentNames}
                  </p>
                )}
              </Link>

              {deal.isMine && (
                <div className="flex gap-2 ml-4">
                  <Link
                    to={`/deals/${deal.id}/edit`}
                    className={
                      //if the deal has overdue tasks, the button is white, otherwise it is blue
                      deal.hasOverdueTask
                        ? "px-3 py-1 rounded border border-(--cl-white) text-(--cl-white)"
                        : "px-3 py-1 rounded border border-(--cl-base-dark) text-(--cl-base-dark)"
                    }
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleArchive(deal.id)}
                    className={
                      //if the deal has overdue tasks, the button is white, otherwise it is red
                      deal.hasOverdueTask
                        ? "px-3 py-1 rounded border border-(--cl-white) text-(--cl-white)"
                        : "px-3 py-1 rounded border border-(--cl-accent-dark) text-(--cl-accent-dark)"
                    }
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default WorkflowIndex;
