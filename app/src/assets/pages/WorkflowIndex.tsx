import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type DealSummary = {
  id: string;
  property_address: string;
  deal_type: "sale" | "rental";
  status: string;
};

function WorkflowIndex() {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("deals")
      .select("id, property_address, deal_type, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch deals:", error);
        }
        setDeals(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading deals…</p>;
  if (deals.length === 0) return <p>No active deals yet.</p>;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1>Your Active Deals</h1>
      <Link
        to="/deals/new"
        className="self-start bg-(--cl-accent-dark) text-(--cl-white) px-4 py-2 rounded"
      >
        + New Deal
      </Link>
      {deals.map((deal) => (
        <Link
          key={deal.id}
          to={`/workflow/${deal.id}`}
          className="bg-(--cl-white) text-(--cl-dark-blue) p-4 rounded shadow-md hover:shadow-lg transition-shadow"
        >
          <p className="font-medium">{deal.property_address}</p>
          <p className="text-sm capitalize">
            {deal.deal_type} · {deal.status}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default WorkflowIndex;
