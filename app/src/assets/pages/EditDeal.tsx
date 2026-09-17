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
import {
  getDealAgents,
  listAllAgents,
  addAgentToDeal,
  updateAgentSplit,
  removeAgentFromDeal,
  type DealAgent,
  type AgentDirectoryEntry,
} from "../../lib/dealAgents";
import { isValidEmail, isValidPhone } from "../../lib/validators";
import { useAuth } from "../../lib/AuthProvider";
import AttorneyPicker from "../components/AttorneyPicker";
import ConfirmDialog from "../components/ConfirmDialog";

type DealType = "sale" | "rental";
type DealStatus = "active" | "closed" | "fell_through";
type ClientRole = "seller" | "buyer";

type DealRow = {
  id: string;
  property_address: string;
  deal_type: DealType;
  status: DealStatus;
  attorney_id: string | null;
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
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyAddress, setPropertyAddress] = useState("");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [status, setStatus] = useState<DealStatus>("active");
  const [attorneyId, setAttorneyId] = useState("");
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
  const [duplicateClient, setDuplicateClient] = useState<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // -- Agent management state --
  const [dealAgents, setDealAgents] = useState<DealAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [savingSplitId, setSavingSplitId] = useState<string | null>(null);
  const [splitDrafts, setSplitDrafts] = useState<Record<string, string>>({});

  const [agentDirectory, setAgentDirectory] = useState<AgentDirectoryEntry[]>(
    [],
  );
  const [newAgentId, setNewAgentId] = useState("");
  const [newAgentSplit, setNewAgentSplit] = useState("");
  const [addingAgent, setAddingAgent] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    supabase
      .from("deals")
      .select(
        "id, property_address, deal_type, status, attorney_id, bond_details, listing_price, purchase_price, expected_commission, commission_split_pct, expected_close_date",
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
        setAttorneyId(deal.attorney_id ?? "");
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

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    getDealAgents(dealId)
      .then((data) => {
        if (cancelled) return;
        setDealAgents(data);
        setSplitDrafts(
          Object.fromEntries(
            data.map((agent) => [
              agent.id,
              agent.commissionSplitPct.toString(),
            ]),
          ),
        );
        setAgentsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load deal agents:", err);
        setAgentError("Couldn't load agents for this deal.");
        setAgentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dealId]);

  useEffect(() => {
    let cancelled = false;

    listAllAgents()
      .then((data) => {
        if (cancelled) return;
        setAgentDirectory(data);
      })
      .catch((err) => {
        console.error("Failed to load agent directory:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        attorneyId: attorneyId || undefined,
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
          : "Something went wrong updating the board.",
      );
      setSubmitting(false);
    }
  }

  async function handleNewClientNameBlur(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .ilike("name", trimmed)
      .limit(1)
      .maybeSingle();

    if (error || !data) return;

    setDuplicateClient({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
    });
    setDuplicateDialogOpen(true);
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
  async function handleUseExistingClientOnDeal() {
    if (!dealId || !duplicateClient) return;
    setDuplicateDialogOpen(false);

    try {
      // Link the existing client directly -- no new clients row created
      const { error } = await supabase.from("deal_clients").insert({
        deal_id: dealId,
        client_id: duplicateClient.id,
        role: newClientRole,
      });
      if (error) throw error;

      const refreshed = await getDealClients(dealId);
      setDealClients(refreshed);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
    } catch (err) {
      setClientError(
        err instanceof Error ? err.message : "Failed to link existing client.",
      );
    } finally {
      setDuplicateClient(null);
    }
  }

  async function handleRemoveClient(dealClientRowId: string) {
    setClientError(null);
    setRemovingId(dealClientRowId);

    if (dealClients.length <= 1) {
      setClientError("Your deal must have at least one client.");
      setRemovingId(null);
      return;
    }

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

  // Agents already on this deal are excluded from the "add" picker --
  // deal_agents has a unique(deal_id, agent_id) constraint, so re-adding
  // one would fail anyway; filtering here just avoids offering it at all.
  const availableAgents = agentDirectory.filter(
    (a) => !dealAgents.some((da) => da.agentId === a.id),
  );

  const totalSplitPct = dealAgents.reduce((sum, a) => {
    const split = parseFloat(
      splitDrafts[a.id] ?? a.commissionSplitPct.toString(),
    );
    return Number.isNaN(split) ? sum : sum + split;
  }, 0);

  async function handleAddAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId || !newAgentId) return;

    const splitValue = parseFloat(newAgentSplit);
    if (Number.isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
      setAgentError("Enter a commission split between 0 and 100.");
      return;
    }

    setAgentError(null);
    setAddingAgent(true);

    try {
      await addAgentToDeal(dealId, newAgentId, splitValue);
      const refreshed = await getDealAgents(dealId);
      setDealAgents(refreshed);
      setSplitDrafts(
        Object.fromEntries(
          refreshed.map((agent) => [
            agent.id,
            agent.commissionSplitPct.toString(),
          ]),
        ),
      );
      setNewAgentId("");
      setNewAgentSplit("");
    } catch (err) {
      setAgentError(
        err instanceof Error ? err.message : "Failed to add agent.",
      );
    } finally {
      setAddingAgent(false);
    }
  }

  function handleSplitChange(dealAgentRowId: string, value: string) {
    setSplitDrafts((prev) => ({ ...prev, [dealAgentRowId]: value }));
    setAgentError(null);
  }

  async function handleUpdateSplit(dealAgentRowId: string) {
    const value = splitDrafts[dealAgentRowId] ?? "";
    const splitValue = parseFloat(value);
    if (Number.isNaN(splitValue) || splitValue < 0 || splitValue > 100) {
      setAgentError("Enter a commission split between 0 and 100.");
      return;
    }

    setSavingSplitId(dealAgentRowId);
    setAgentError(null);

    try {
      await updateAgentSplit(dealAgentRowId, splitValue);
      setDealAgents((prev) =>
        prev.map((a) =>
          a.id === dealAgentRowId
            ? { ...a, commissionSplitPct: splitValue }
            : a,
        ),
      );
    } catch (err) {
      setAgentError(
        err instanceof Error ? err.message : "Failed to update split.",
      );
      if (dealId) {
        const refreshed = await getDealAgents(dealId);
        setDealAgents(refreshed);
      }
    } finally {
      setSavingSplitId(null);
    }
  }

  async function handleRemoveAgent(dealAgentRowId: string) {
    setAgentError(null);

    if (dealAgents.length <= 1) {
      setAgentError("A deal must have at least one assigned agent.");
      return;
    }

    setRemovingAgentId(dealAgentRowId);
    try {
      await removeAgentFromDeal(dealAgentRowId);
      setDealAgents((prev) => prev.filter((a) => a.id !== dealAgentRowId));
      setSplitDrafts((prev) => {
        const next = { ...prev };
        delete next[dealAgentRowId];
        return next;
      });
    } catch (err) {
      setAgentError(
        err instanceof Error ? err.message : "Failed to remove agent.",
      );
    } finally {
      setRemovingAgentId(null);
    }
  }

  if (loading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );

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
            placeholder="Property address..."
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            required
          />

          <label className="flex gap-1 justify-between items-center">
            Deal type
            <select
              value={dealType}
              onChange={(e) => setDealType(e.target.value as DealType)}
            >
              <option value="sale">Sale</option>
              <option value="rental">Rental</option>
            </select>
          </label>

          <label className="flex gap-1 justify-between items-center">
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

          <label className="flex gap-1 justify-between items-center">
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
            <label className="flex gap-1 justify-between items-center">
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
          <AttorneyPicker value={attorneyId} onChange={setAttorneyId} />
          <input
            type="text"
            placeholder="Bond details..."
            value={bondDetails}
            onChange={(e) => setBondDetails(e.target.value)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Commission</legend>
          <label className="flex gap-1 justify-between items-center">
            Expected commission
            <input
              type="number"
              step="0.01"
              min="0"
              value={expectedCommission}
              onChange={(e) => setExpectedCommission(e.target.value)}
            />
          </label>
          <label className="flex gap-1 justify-between items-center">
            Commission split with another agency(%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={commissionSplitPct}
              onChange={(e) => setCommissionSplitPct(e.target.value)}
            />
          </label>
          <label className="flex gap-1 justify-between items-center">
            Expected close date
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </label>
        </fieldset>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <hr className="my-6" />

      <section className="flex flex-col gap-4">
        <h2>Agents on this deal</h2>
        <p className="text-sm text-(--cl-dark-blue)/70">
          Internal split of the office's own commission share between assigned
          agents - separate from the Commission split (%) above, which is the
          office-vs-external-agent split.
        </p>

        {agentError && <p className="text-red-600">{agentError}</p>}
        {agentsLoading && (
          <img
            src="/blocks-shuffle-3.svg"
            alt="Loading agents..."
            className="w-6 h-6"
          />
        )}

        {!agentsLoading && (
          <>
            {dealAgents.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center border rounded p-2"
              >
                <div>
                  <p>
                    {a.fullName}
                    {a.agentId === session?.user.id && (
                      <span className="text-sm text-(--cl-dark-blue)/60">
                        {" "}
                        (you)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={splitDrafts[a.id] ?? a.commissionSplitPct}
                    onChange={(e) => handleSplitChange(a.id, e.target.value)}
                    onBlur={() => void handleUpdateSplit(a.id)}
                    className="w-20 border rounded p-1 text-right"
                  />
                  <span className="text-sm">
                    {savingSplitId === a.id ? "Saving…" : "%"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAgent(a.id)}
                    disabled={removingAgentId === a.id}
                    className="text-sm underline"
                  >
                    {removingAgentId === a.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}

            <p
              className={`text-sm ${totalSplitPct === 100 ? "text-(--cl-dark-blue)/70" : "text-red-600"}`}
            >
              Total split: {totalSplitPct.toFixed(2)}%
              {Math.round(totalSplitPct * 100) / 100 !== 100 &&
                " (should add up to 100%)"}
            </p>
          </>
        )}

        <form
          onSubmit={handleAddAgent}
          className="flex flex-col gap-2 border rounded p-3"
        >
          <span className="font-medium text-sm">Add an agent</span>

          <label className="flex gap-1 justify-between items-center">
            Agent
            <select
              value={newAgentId}
              onChange={(e) => setNewAgentId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a colleague…
              </option>
              {availableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex gap-1 justify-between items-center">
            Commission split (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={newAgentSplit}
              disabled={!newAgentId}
              onChange={(e) => setNewAgentSplit(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={addingAgent || !newAgentId}
            className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
          >
            {addingAgent ? "Adding…" : "Add agent"}
          </button>
        </form>
      </section>

      <hr className="my-6" />

      <section className="flex flex-col gap-4">
        <h2>Clients on this deal</h2>

        {clientError && <p className="text-red-600">{clientError}</p>}
        {clientsLoading && (
          <img
            src="/blocks-shuffle-3.svg"
            alt="Loading clients..."
            className="w-6 h-6"
          />
        )}

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

          <label className="flex gap-1 justify-between items-center">
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
            placeholder="Name..."
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            onBlur={(e) => handleNewClientNameBlur(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email..."
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone..."
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
          />

          <button
            type="submit"
            disabled={addingClient}
            className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
          >
            {addingClient ? "Adding…" : "Add client"}
          </button>
        </form>
      </section>
      {duplicateClient && (
        <ConfirmDialog
          open={duplicateDialogOpen}
          title="Client already exists"
          message={`A client named "${duplicateClient.name}" already exists${
            duplicateClient.email ? ` (${duplicateClient.email})` : ""
          }. Use their existing details, or create a new record?`}
          confirmLabel="Use existing"
          cancelLabel="Create new"
          onConfirm={handleUseExistingClientOnDeal}
          onCancel={() => {
            setDuplicateDialogOpen(false);
            setDuplicateClient(null);
          }}
        />
      )}
    </div>
  );
}

export default EditDeal;
