import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { updateDeal } from "../../lib/deals";

type DealType = "sale" | "rental";
type DealStatus = "active" | "closed" | "fell_through";

type DealRow = {
  id: string;
  property_address: string;
  deal_type: DealType;
  status: DealStatus;
  attorney_name: string | null;
  attorney_contact: string | null;
  bond_details: string | null;
  listing_price: number | null;
  purchase_price: number | null;
  expected_commission: number | null;
  commission_split_pct: number | null;
  expected_close_date: string | null;
};

function EditDeal() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyAddress, setPropertyAddress] = useState("");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [status, setStatus] = useState<DealStatus>("active");
  const [attorneyName, setAttorneyName] = useState("");
  const [attorneyContact, setAttorneyContact] = useState("");
  const [bondDetails, setBondDetails] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expectedCommission, setExpectedCommission] = useState("");
  const [commissionSplitPct, setCommissionSplitPct] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    supabase
      .from("deals")
      .select(
        "id, property_address, deal_type, status, attorney_name, attorney_contact, bond_details, listing_price, purchase_price, expected_commission, commission_split_pct, expected_close_date",
      )
      .eq("id", dealId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error || !data) {
          // Either genuinely doesn't exist, or RLS silently excluded a deal
          // that isn't this agent's -- both look identical here by design.
          setNotFound(true);
          setLoading(false);
          return;
        }

        const deal = data as DealRow;
        setPropertyAddress(deal.property_address);
        setDealType(deal.deal_type);
        setStatus(deal.status);
        setAttorneyName(deal.attorney_name ?? "");
        setAttorneyContact(deal.attorney_contact ?? "");
        setBondDetails(deal.bond_details ?? "");
        setListingPrice(deal.listing_price?.toString() ?? "");
        setPurchasePrice(deal.purchase_price?.toString() ?? "");
        setExpectedCommission(deal.expected_commission?.toString() ?? "");
        setCommissionSplitPct(deal.commission_split_pct?.toString() ?? "");
        setExpectedCloseDate(deal.expected_close_date ?? "");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dealId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateDeal(dealId, {
        propertyAddress,
        dealType,
        status,
        attorneyName: attorneyName || undefined,
        attorneyContact: attorneyContact || undefined,
        bondDetails: bondDetails || undefined,
        listingPrice: listingPrice ? parseFloat(listingPrice) : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        expectedCommission: expectedCommission
          ? parseFloat(expectedCommission)
          : undefined,
        commissionSplitPct: commissionSplitPct
          ? parseFloat(commissionSplitPct)
          : undefined,
        expectedCloseDate: expectedCloseDate || undefined,
      });

      navigate(`/workflow/${dealId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong updating the deal.",
      );
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-4">Loading deal…</p>;

  if (notFound) {
    return (
      <div className="p-4">
        <p>This deal doesn't exist, or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1>Edit Deal</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Property</legend>
          <input
            type="text"
            placeholder="Property address"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            required
          />

          <label>
            Deal type
            <select
              value={dealType}
              onChange={(e) => setDealType(e.target.value as DealType)}
            >
              <option value="sale">Sale</option>
              <option value="rental">Rental</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DealStatus)}
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="fell_through">Fell Through</option>
            </select>
          </label>

          <label>
            {dealType === "sale" ? "Listing price" : "Monthly rent"}
            <input
              type="number"
              step="0.01"
              min="0"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
            />
          </label>

          {dealType === "sale" && (
            <label>
              Purchase price
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </label>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Attorney & bond</legend>
          <input
            type="text"
            placeholder="Attorney name"
            value={attorneyName}
            onChange={(e) => setAttorneyName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Attorney contact"
            value={attorneyContact}
            onChange={(e) => setAttorneyContact(e.target.value)}
          />
          <input
            type="text"
            placeholder="Bond details"
            value={bondDetails}
            onChange={(e) => setBondDetails(e.target.value)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Commission</legend>
          <label>
            Expected commission
            <input
              type="number"
              step="0.01"
              min="0"
              value={expectedCommission}
              onChange={(e) => setExpectedCommission(e.target.value)}
            />
          </label>
          <label>
            Commission split (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={commissionSplitPct}
              onChange={(e) => setCommissionSplitPct(e.target.value)}
            />
          </label>
          <label>
            Expected close date
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </label>
        </fieldset>

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

export default EditDeal;
