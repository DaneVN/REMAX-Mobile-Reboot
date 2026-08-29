import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getActiveDealsProgress,
  type DealProgress,
} from "../../lib/deal_progress";

const TOTAL_STAGES = 7;

const STAGE_LABELS: Record<number, string> = {
  1: "Listing",
  2: "Offer",
  3: "Sale",
  4: "Suspensive Conditions",
  5: "Lodging",
  6: "Registration",
  7: "Post-Transaction",
};

function DealProgressCard() {
  const [deals, setDeals] = useState<DealProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getActiveDealsProgress()
      .then((data) => {
        if (cancelled) return;
        setDeals(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load deal progress:", err);
        setError("Couldn't load your deals right now.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-(--cl-base) text-(--cl-dark-blue) p-4 rounded shadow-md w-full max-w-2xl">
      <h2>Deal Progress</h2>

      {loading && <p>Loading your deals…</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && !error && deals.length === 0 && <p>No active deals yet.</p>}

      {!loading && !error && deals.length > 0 && (
        <ul className="flex flex-col gap-3 mt-2">
          {deals.map((deal) => {
            const percent = Math.round(
              (deal.currentStage / TOTAL_STAGES) * 100,
            );

            return (
              <li key={deal.dealId}>
                <Link
                  to={`/workflow/${deal.dealId}`}
                  className="block bg-(--cl-white) rounded p-3 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium">{deal.propertyAddress}</span>
                    <span className="text-sm">
                      Stage {deal.currentStage} of {TOTAL_STAGES}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={deal.currentStage}
                    aria-valuemin={1}
                    aria-valuemax={TOTAL_STAGES}
                    aria-label={`Progress for ${deal.propertyAddress}: stage ${deal.currentStage} of ${TOTAL_STAGES}`}
                    className="w-full h-2 bg-(--cl-accent-dark)/20 rounded overflow-hidden"
                  >
                    <div
                      className="h-full bg-(--cl-accent-dark) rounded transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-xs mt-1 text-(--cl-dark-blue)/70">
                    {STAGE_LABELS[deal.currentStage]}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default DealProgressCard;
