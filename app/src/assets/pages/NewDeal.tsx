import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { createDealWithBoard } from "../../lib/deals";
import { isValidEmail, isValidPhone } from "../../lib/validators";

type Representing = "seller" | "buyer" | "rental";
type DealType = "sale" | "rental";

type ClientRow = {
  name: string;
  email: string;
  phone: string;
};

const EMPTY_CLIENT: ClientRow = { name: "", email: "", phone: "" };

function NewDeal() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [propertyAddress, setPropertyAddress] = useState("");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [representing, setRepresenting] = useState<Representing>("seller");

  // One dynamic list of clients for whichever side is being represented --
  // a deal only ever collects clients for ONE side through this form (the
  // other side, e.g. the buyer on a listing you don't also represent, gets
  // added later once they're known, via the Edit Deal page).
  const [clients, setClients] = useState<ClientRow[]>([{ ...EMPTY_CLIENT }]);

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

  const clientLabel =
    representing === "seller"
      ? "Seller"
      : representing === "buyer"
        ? "Buyer"
        : "Tenant";

  function updateClient(index: number, field: keyof ClientRow, value: string) {
    setClients((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addClientRow() {
    setClients((prev) => [...prev, { ...EMPTY_CLIENT }]);
  }

  function removeClientRow(index: number) {
    setClients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    const trimmedAddress = propertyAddress.trim();
    if (!trimmedAddress) {
      setError("Property address is required.");
      return;
    }

    // Every client row needs at least a name; email/phone stay optional but
    // must be valid format if the agent entered something.
    const trimmedClients = clients.map((c) => ({
      name: c.name.trim(),
      email: c.email.trim(),
      phone: c.phone.trim(),
    }));

    if (trimmedClients.some((c) => !c.name)) {
      setError(
        `Every ${clientLabel.toLowerCase()} needs a name (or remove the empty row).`,
      );
      return;
    }
    for (const c of trimmedClients) {
      if (c.phone && !isValidPhone(c.phone)) {
        setError(`Please enter a valid 10-digit phone number for ${c.name}.`);
        return;
      }
      if (c.email && !isValidEmail(c.email)) {
        setError(`Please enter a valid email address for ${c.name}.`);
        return;
      }
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
      const clientInputs = trimmedClients.map((c) => ({
        name: c.name,
        email: c.email || undefined,
        phone: c.phone || undefined,
        type: (representing === "seller"
          ? "seller"
          : representing === "buyer"
            ? "buyer"
            : "tenant") as "seller" | "buyer" | "tenant",
      }));

      const { dealId } = await createDealWithBoard({
        agentId: session.user.id,
        propertyAddress: trimmedAddress,
        dealType,
        representing,
        sellerClients: representing === "seller" ? clientInputs : undefined,
        buyerClients:
          representing === "buyer" || representing === "rental"
            ? clientInputs
            : undefined,
        attorneyName: attorneyName.trim() || undefined,
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

        <fieldset className="flex flex-col gap-3">
          <legend className="font-medium">{clientLabel}(s)</legend>

          {clients.map((client, index) => (
            <div key={index} className="flex flex-col gap-2 border rounded p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {clientLabel} {clients.length > 1 ? index + 1 : ""}
                </span>
                {clients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeClientRow(index)}
                    className="text-sm underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder={`${clientLabel} name`}
                value={client.name}
                onChange={(e) => updateClient(index, "name", e.target.value)}
                required
              />
              <input
                type="email"
                placeholder={`${clientLabel} email`}
                value={client.email}
                onChange={(e) => updateClient(index, "email", e.target.value)}
              />
              <input
                type="tel"
                placeholder={`${clientLabel} phone`}
                value={client.phone}
                onChange={(e) => updateClient(index, "phone", e.target.value)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addClientRow}
            className="self-start text-sm underline"
          >
            + Add another {clientLabel.toLowerCase()}
          </button>
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
