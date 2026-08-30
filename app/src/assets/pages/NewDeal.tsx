import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { createDealWithBoard } from "../../lib/deals";
import { isValidEmail, isValidPhone } from "../../lib/validators";

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
  const [attorneyEmail, setAttorneyEmail] = useState("");
  const [attorneyPhone, setAttorneyPhone] = useState("");
  const [bondDetails, setBondDetails] = useState("");

  const [listingPrice, setListingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expectedCommission, setExpectedCommission] = useState("");
  const [commissionSplitPct, setCommissionSplitPct] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    // Trim text fields up front so whitespace-only entries don't sneak past
    // "required" checks, and so nothing gets stored with stray padding.
    const trimmedAddress = propertyAddress.trim();
    const trimmedClientName = clientName.trim();

    if (!trimmedAddress) {
      setError("Property address is required.");
      return;
    }
    if (!trimmedClientName) {
      setError("Client name is required.");
      return;
    }

    // Each of these fields is optional -- only validate format if the agent
    // actually entered something. An empty optional field is never an error.
    if (clientPhone && !isValidPhone(clientPhone)) {
      setError("Please enter a valid 10-digit client phone number.");
      return;
    }
    if (clientEmail && !isValidEmail(clientEmail)) {
      setError("Please enter a valid client email address.");
      return;
    }
    if (attorneyPhone && !isValidPhone(attorneyPhone)) {
      setError("Please enter a valid 10-digit attorney phone number.");
      return;
    }
    if (attorneyEmail && !isValidEmail(attorneyEmail)) {
      setError("Please enter a valid attorney email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const clientTypeMap: Record<Representing, "seller" | "buyer" | "tenant"> =
        {
          seller: "seller",
          buyer: "buyer",
          rental: "tenant",
        };

      const clientInput = trimmedClientName
        ? {
            name: trimmedClientName,
            email: clientEmail || undefined,
            phone: clientPhone || undefined,
            type: clientTypeMap[representing],
          }
        : undefined;

      const { dealId } = await createDealWithBoard({
        agentId: session.user.id,
        propertyAddress: trimmedAddress,
        dealType,
        representing,
        sellerClient: representing === "seller" ? clientInput : undefined,
        buyerClient:
          representing === "buyer" || representing === "rental"
            ? clientInput
            : undefined,
        attorneyName: attorneyName.trim() || undefined,
        // Combine into one string for storage, since `deals.attorney_contact`
        // is a single text column -- but each was validated independently above.
        attorneyContact:
          [attorneyEmail, attorneyPhone].filter(Boolean).join(" / ") ||
          undefined,
        bondDetails: bondDetails.trim() || undefined,
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
              <option value="seller">
                {dealType === "sale" ? "Seller (listing agent)" : "Landlord"}
              </option>
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
            required
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
            type="email"
            placeholder="Attorney email"
            value={attorneyEmail}
            onChange={(e) => setAttorneyEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Attorney phone"
            value={attorneyPhone}
            onChange={(e) => setAttorneyPhone(e.target.value)}
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
          {submitting ? "Creating…" : "Create Deal"}
        </button>
      </form>
    </div>
  );
}

export default NewDeal;
