import {
  getActiveDealsProgress,
  type DealProgress,
} from "../../lib/deal_progress";
import { useState } from "react";

function Pipeline() {
  const [deals, setDeals] = useState<DealProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  getActiveDealsProgress()
    .then((data) => {
      setDeals(data);
      setLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setLoading(false);
    });

  return (
    <div>
      <h1>Your Pipeline</h1>
      <p>
        This page shows your pipeline for all active deals. It makes use of the
        deals that are in the Sale stage of the process.
      </p>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && !error && (
        <div>
          <h2>Active Deals</h2>
          <ul>
            {deals.map((deal) => (
              <li key={deal.dealId}>
                <strong>{deal.propertyAddress}</strong>
                {deal.firstBuyerName && <strong> {deal.firstBuyerName}</strong>}
                <span> - {deal.representing} </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Pipeline;
