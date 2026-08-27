import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { createDealWithBoard } from "../../lib/deals";

type Representing = "seller" | "buyer" | "rental";
type DealType = "sale" | "rental";

function NewDeal() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [propertyAddress, setPropertyAddress] = useState("");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [representing, setRepresenting] = useState<Representing>("seller");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [attorneyName, setAttorneyName] = useState("");
  const [attorneyContact, setAttorneyContact] = useState("");
  const [bondDetails, setBondDetails] = useState("");

  const [listingPrice, setListingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [percentCommission, setPercentCommission] = useState("");
  const [commissionSplitPct, setCommissionSplitPct] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    setError(null);

    try {
      // "representing" tells us whether the client we're capturing is the
      // seller, the buyer, or a tenant (rental) — mapped to the correct
      // side of the deal and the correct client "type" for the clients table.
      const clientTypeMap: Record<Representing, "seller" | "buyer" | "tenant"> =
        {
          seller: "seller",
          buyer: "buyer",
          rental: "tenant",
        };

      const clientInput = clientName
        ? {
            name: clientName,
            email: clientEmail || undefined,
            phone: clientPhone || undefined,
            type: clientTypeMap[representing],
          }
        : undefined;

      const { dealId } = await createDealWithBoard({
        agentId: session.user.id,
        propertyAddress,
        dealType,
        representing,
        sellerClient: representing === "seller" ? clientInput : undefined,
        buyerClient:
          representing === "buyer" || representing === "rental"
            ? clientInput
            : undefined,
        attorneyName: attorneyName || undefined,
        attorneyContact: attorneyContact || undefined,
        bondDetails: bondDetails || undefined,
        listingPrice: listingPrice ? parseFloat(listingPrice) : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        percentCommission: percentCommission
          ? parseFloat(percentCommission)
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
          : "Something went wrong creating the deal.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1>New Deal</h1>
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
            Representing
            <select
              value={representing}
              onChange={(e) => setRepresenting(e.target.value as Representing)}
            >
              <option value="seller">Seller (listing agent)</option>
              <option value="buyer">Buyer</option>
              <option value="rental">Tenant (rental)</option>
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
              Purchase price (once agreed)
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
          <legend className="font-medium">Client</legend>
          <input
            type="text"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Client email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Client phone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />
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
              value={percentCommission}
              onChange={(e) => setPercentCommission(e.target.value)}
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
          {submitting ? "Creating…" : "Create Deal"}
        </button>
      </form>
    </div>
  );
}

export default NewDeal;
