import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { archiveDeal, deleteDealPermanently } from "../../lib/deals";
import { useUserRole } from "../../lib/useUserRole";
import ConfirmDialog from "../components/ConfirmDialog";

type DealSummary = {
  id: string;
  property_address: string;
  deal_type: "sale" | "rental";
  status: string;
};

function WorkflowIndex() {
  const { isAdmin } = useUserRole();
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("deals")
      .select("id, property_address, deal_type, status")
      .eq("status", "active")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return; // component unmounted before the request resolved

        if (error) {
          console.error("Failed to fetch deals:", error);
          setActionError("Couldn't load your deals.");
        }
        setDeals(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleArchive(dealId: string) {
    setActionError(null);
    try {
      await archiveDeal(dealId);
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove deal.",
      );
    }
  }

  async function handleDeletePermanentlyConfirmed() {
    if (!pendingDeleteId) return;
    setActionError(null);
    try {
      await deleteDealPermanently(pendingDeleteId);
      setDeals((prev) => prev.filter((d) => d.id !== pendingDeleteId));
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete deal.",
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (loading) return <p>Loading deals…</p>;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1>Your Active Deals</h1>
      <div className="flex gap-3">
        <Link
          to="/deals/new"
          className="bg-(--cl-accent-dark) text-(--cl-white) px-4 py-2 rounded"
        >
          + New Deal
        </Link>
        <Link to="/deals/archived" className="border px-4 py-2 rounded">
          View Archived
        </Link>
      </div>

      {actionError && <p className="text-red-700">{actionError}</p>}
      {deals.length === 0 && <p>No active deals yet.</p>}

      {deals.map((deal) => (
        <div
          key={deal.id}
          className="bg-(--cl-white) text-(--cl-dark-blue) p-4 rounded shadow-md flex justify-between items-center"
        >
          <Link to={`/workflow/${deal.id}`} className="flex-1">
            <p className="font-medium">{deal.property_address}</p>
            <p className="text-sm capitalize">
              {deal.deal_type} · {deal.status}
            </p>
          </Link>

          <div className="flex gap-2 ml-4">
            <Link
              to={`/deals/${deal.id}/edit`}
              className="px-3 py-1 rounded border"
            >
              Edit
            </Link>
            <button
              onClick={() => handleArchive(deal.id)}
              className="px-3 py-1 rounded border"
            >
              <img src="Trash.svg" alt="Archive" className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setPendingDeleteId(deal.id)}
                className="px-3 py-1 rounded bg-(--cl-accent-dark) text-(--cl-white)"
              >
                Delete Permanently
              </button>
            )}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Permanently delete this deal?"
        message="This will completely remove the deal, its workflow board, and all associated tasks. This cannot be undone."
        confirmLabel="Delete Permanently"
        destructive
        onConfirm={handleDeletePermanentlyConfirmed}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

export default WorkflowIndex;
