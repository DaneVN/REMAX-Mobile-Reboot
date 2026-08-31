import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  updateDeal,
  getDealClients,
  addClientToDeal,
  removeClientFromDeal,
  type DealClient,
} from "../../lib/deals";
import { isValidEmail, isValidPhone } from "../../lib/validators";

type DealType = "sale" | "rental";
type DealStatus = "active" | "closed" | "fell_through";
type ClientRole = "seller" | "buyer";

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

  // -- Client management state --
  const [dealClients, setDealClients] = useState<DealClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [newClientRole, setNewClientRole] = useState<ClientRole>("seller");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [addingClient, setAddingClient] = useState(false);

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

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    getDealClients(dealId)
      .then((data) => {
        if (cancelled) return;
        setDealClients(data);
        setClientsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load deal clients:", err);
        setClientError("Couldn't load clients for this deal.");
        setClientsLoading(false);
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

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId) return;

    const trimmedName = newClientName.trim();
    const trimmedEmail = newClientEmail.trim();
    const trimmedPhone = newClientPhone.trim();

    if (!trimmedName) {
      setClientError("Client name is required.");
      return;
    }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      setClientError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setClientError("Please enter a valid email address.");
      return;
    }

    setClientError(null);
    setAddingClient(true);

    try {
      // Tenants are stored under the "buyer" role on rental deals, per the
      // existing convention -- mirrors the mapping used in NewDeal.tsx.
      const clientType =
        newClientRole === "seller"
          ? "seller"
          : dealType === "rental"
            ? "tenant"
            : "buyer";

      await addClientToDeal(dealId, newClientRole, {
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        type: clientType,
      });

      const refreshed = await getDealClients(dealId);
      setDealClients(refreshed);

      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
    } catch (err) {
      setClientError(
        err instanceof Error ? err.message : "Failed to add client.",
      );
    } finally {
      setAddingClient(false);
    }
  }

  async function handleRemoveClient(dealClientRowId: string) {
    setClientError(null);
    setRemovingId(dealClientRowId);
    try {
      await removeClientFromDeal(dealClientRowId);
      setDealClients((prev) => prev.filter((c) => c.id !== dealClientRowId));
    } catch (err) {
      setClientError(
        err instanceof Error ? err.message : "Failed to remove client.",
      );
    } finally {
      setRemovingId(null);
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

  const sellers = dealClients.filter((c) => c.role === "seller");
  const buyers = dealClients.filter((c) => c.role === "buyer");

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

      <hr className="my-6" />

      <section className="flex flex-col gap-4">
        <h2>Clients on this deal</h2>

        {clientError && <p className="text-red-600">{clientError}</p>}
        {clientsLoading && <p>Loading clients…</p>}

        {!clientsLoading && (
          <>
            <div>
              <h3 className="font-medium">Sellers</h3>
              {sellers.length === 0 && (
                <p className="text-sm">None linked yet.</p>
              )}
              {sellers.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center border rounded p-2 mt-1"
                >
                  <div>
                    <p>{c.name}</p>
                    <p className="text-sm text-(--cl-dark-blue)/70">
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveClient(c.id)}
                    disabled={removingId === c.id}
                    className="text-sm underline"
                  >
                    {removingId === c.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-medium">
                Buyers{dealType === "rental" ? " / Tenants" : ""}
              </h3>
              {buyers.length === 0 && (
                <p className="text-sm">None linked yet.</p>
              )}
              {buyers.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center border rounded p-2 mt-1"
                >
                  <div>
                    <p>{c.name}</p>
                    <p className="text-sm text-(--cl-dark-blue)/70">
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveClient(c.id)}
                    disabled={removingId === c.id}
                    className="text-sm underline"
                  >
                    {removingId === c.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <form
          onSubmit={handleAddClient}
          className="flex flex-col gap-2 border rounded p-3"
        >
          <span className="font-medium text-sm">Add a client</span>

          <label>
            Role
            <select
              value={newClientRole}
              onChange={(e) => setNewClientRole(e.target.value as ClientRole)}
            >
              <option value="seller">Seller</option>
              <option value="buyer">
                {dealType === "rental" ? "Tenant" : "Buyer"}
              </option>
            </select>
          </label>

          <input
            type="text"
            placeholder="Name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
          />

          <button type="submit" disabled={addingClient} className="self-start">
            {addingClient ? "Adding…" : "Add client"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default EditDeal;
