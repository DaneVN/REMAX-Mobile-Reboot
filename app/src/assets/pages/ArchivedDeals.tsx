import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { restoreDeal } from "../../lib/deals";

type ArchivedDeal = {
  id: string;
  property_address: string;
  deal_type: "sale" | "rental";
  status: string;
};

function ArchivedDeals() {
  const [deals, setDeals] = useState<ArchivedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("deals")
      .select("id, property_address, deal_type, status")
      .eq("is_deleted", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error("Failed to fetch archived deals:", error);
          setError("Couldn't load archived deals.");
        }
        setDeals((data ?? []) as ArchivedDeal[]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRestore(dealId: string) {
    setError(null);
    setRestoringId(dealId);
    try {
      await restoreDeal(dealId);
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore deal.");
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) return <p className="p-4">Loading archived deals…</p>;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1>Archived Deals</h1>
      <Link to="/workflow" className="self-start underline">
        &larr; Back to active deals
      </Link>

      {error && <p className="text-red-700">{error}</p>}
      {deals.length === 0 && <p>No archived deals.</p>}

      {deals.map((deal) => (
        <div
          key={deal.id}
          className="bg-(--cl-white) text-(--cl-dark-blue) p-4 rounded shadow-md flex justify-between items-center"
        >
          <div>
            <p className="font-medium">{deal.property_address}</p>
            <p className="text-sm capitalize">
              {deal.deal_type} · {deal.status}
            </p>
          </div>

          <button
            onClick={() => handleRestore(deal.id)}
            disabled={restoringId === deal.id}
            className="px-3 py-1 rounded bg-(--cl-accent) text-(--cl-white)"
          >
            {restoringId === deal.id ? "Restoring…" : "Restore"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default ArchivedDeals;
