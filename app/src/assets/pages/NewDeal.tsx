import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { createDealWithBoard } from "../../lib/deals";
import {
  listAllAgents,
  addAgentToDeal,
  getDealAgents,
  updateAgentSplit,
  type AgentDirectoryEntry,
} from "../../lib/dealAgents";
import AttorneyPicker from "../components/AttorneyPicker";
import { isValidEmail, isValidPhone } from "../../lib/validators";
import ConfirmDialog from "../components/ConfirmDialog";
import type { ExistingClient } from "../../lib/useDuplicateClientCheck";
import { supabase } from "../../lib/supabaseClient";

type Representing = "seller" | "buyer" | "rental";
type DealType = "sale" | "rental";

type ClientRow = {
  name: string;
  email: string;
  phone: string;
};

type CoAgentRow = {
  agentId: string;
  splitPct: string;
};

const EMPTY_CLIENT: ClientRow = { name: "", email: "", phone: "" };

function NewDeal() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [propertyAddress, setPropertyAddress] = useState("");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [representing, setRepresenting] = useState<Representing>("seller");

  const [clients, setClients] = useState<ClientRow[]>([{ ...EMPTY_CLIENT }]);
  const [duplicateByIndex, setDuplicateByIndex] = useState<
    Map<number, ExistingClient>
  >(new Map());
  const [duplicateDialogIndex, setDuplicateDialogIndex] = useState<
    number | null
  >(null);
  const [existingClientIds, setExistingClientIds] = useState<
    Map<number, string>
  >(new Map());

  const [attorneyId, setAttorneyId] = useState("");
  const [bondDetails, setBondDetails] = useState("");

  const [listingPrice, setListingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expectedCommission, setExpectedCommission] = useState("");
  const [commissionSplitPct, setCommissionSplitPct] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  const [agentDirectory, setAgentDirectory] = useState<AgentDirectoryEntry[]>(
    [],
  );
  const [mySplitPct, setMySplitPct] = useState("100");
  const [coAgents, setCoAgents] = useState<CoAgentRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    listAllAgents()
      .then((data) => {
        if (cancelled) return;
        setAgentDirectory(data.filter((a) => a.id !== session?.user.id));
      })
      .catch((err) => console.error("Failed to load agent directory:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

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

  function addCoAgentRow() {
    setCoAgents((prev) => [...prev, { agentId: "", splitPct: "" }]);
  }

  function updateCoAgent(
    index: number,
    field: keyof CoAgentRow,
    value: string,
  ) {
    setCoAgents((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  }

  function removeCoAgentRow(index: number) {
    setCoAgents((prev) => prev.filter((_, i) => i !== index));
  }

  function availableAgentsFor(currentIndex: number) {
    const chosenElsewhere = coAgents
      .filter((_, i) => i !== currentIndex)
      .map((a) => a.agentId);
    return agentDirectory.filter((a) => !chosenElsewhere.includes(a.id));
  }

  function handleUseExistingClient(index: number, existing: ExistingClient) {
    updateClient(index, "name", existing.name);
    updateClient(index, "email", existing.email ?? "");
    updateClient(index, "phone", existing.phone ?? "");
    setExistingClientIds((prev) => new Map(prev).set(index, existing.id));
    setDuplicateByIndex((prev) => {
      const m = new Map(prev);
      m.delete(index);
      return m;
    });
    setDuplicateDialogIndex(null);
  }

  function handleCreateNewClient(index: number) {
    setDuplicateByIndex((prev) => {
      const m = new Map(prev);
      m.delete(index);
      return m;
    });
    setDuplicateDialogIndex(null);
  }

  async function handleClientNameBlur(index: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .ilike("name", trimmed)
      .limit(1)
      .maybeSingle();

    if (error || !data) return;

    setDuplicateByIndex((prev) =>
      new Map(prev).set(index, {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      }),
    );
    setDuplicateDialogIndex(index);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    const newErrors: string[] = [];

    const trimmedAddress = propertyAddress.trim();
    if (representing === "seller" && !trimmedAddress)
      newErrors.push("Property address is required.");

    const trimmedClients = clients.map((c) => ({
      name: c.name.trim(),
      email: c.email.trim(),
      phone: c.phone.trim(),
    }));

    if (trimmedClients.some((c) => !c.name))
      newErrors.push(`Every ${clientLabel.toLowerCase()} needs a name.`);

    if (representing === "buyer") {
      trimmedClients.forEach((c, i) => {
        const label = trimmedClients.length > 1 ? ` ${i + 1}` : "";
        if (!c.email)
          newErrors.push(`${clientLabel}${label}: email is required.`);
        if (!c.phone)
          newErrors.push(`${clientLabel}${label}: phone is required.`);
      });
    }

    trimmedClients.forEach((c) => {
      if (c.phone && !isValidPhone(c.phone))
        newErrors.push(
          `"${c.name || "A client"}" has an invalid phone number — enter 10 digits.`,
        );
      if (c.email && !isValidEmail(c.email))
        newErrors.push(
          `"${c.name || "A client"}" has an invalid email address.`,
        );
    });

    if (coAgents.length > 0) {
      if (coAgents.some((a) => !a.agentId))
        newErrors.push(
          "Select an agent for every added row (or remove the empty row).",
        );
      const mySplit = parseFloat(mySplitPct);
      const coSplits = coAgents.map((a) => parseFloat(a.splitPct));
      if (Number.isNaN(mySplit) || coSplits.some((s) => Number.isNaN(s))) {
        newErrors.push("Enter a commission split percentage for every agent.");
      } else {
        const total = mySplit + coSplits.reduce((sum, s) => sum + s, 0);
        if (Math.round(total * 100) / 100 !== 100)
          newErrors.push(
            `Agent commission splits must add up to 100% (currently ${total}%).`,
          );
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setSubmitting(true);

    try {
      const clientInputs = trimmedClients.map((c, index) => {
        const existingId = existingClientIds.get(index);
        return {
          ...(existingId ? { existingId } : {}),
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          type: (representing === "seller"
            ? "seller"
            : representing === "buyer"
              ? "buyer"
              : "tenant") as "seller" | "buyer" | "tenant",
        };
      });

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
        attorneyId: attorneyId || undefined,
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

      if (coAgents.length > 0) {
        const myRow = (await getDealAgents(dealId)).find(
          (a) => a.agentId === session.user.id,
        );
        if (myRow) {
          await updateAgentSplit(myRow.id, parseFloat(mySplitPct));
        }
        for (const a of coAgents) {
          await addAgentToDeal(dealId, a.agentId, parseFloat(a.splitPct));
        }
      }

      navigate(`/workflow/${dealId}`);
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : "Something went wrong creating the deal.",
      ]);
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1>New Deal</h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <fieldset id="property" className="flex flex-col gap-2">
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
          <legend className="font-medium">Property</legend>
          <input
            type="text"
            placeholder="Property address..."
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
          />

          <label className="flex gap-1 justify-between items-center">
            {representing === "seller"
              ? "Listing price"
              : representing === "buyer"
                ? "Expected Price"
                : "Rental price"}
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

        <fieldset id="clients" className="flex flex-col gap-3">
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
                placeholder={`${clientLabel} name...`}
                value={client.name}
                onChange={(e) => updateClient(index, "name", e.target.value)}
                onBlur={(e) => handleClientNameBlur(index, e.target.value)}
              />
              <input
                type="email"
                placeholder={`${clientLabel} email...`}
                value={client.email}
                onChange={(e) => updateClient(index, "email", e.target.value)}
              />
              <input
                type="tel"
                placeholder={`${clientLabel} phone...`}
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

        <fieldset id="agents" className="flex flex-col gap-3">
          <legend className="font-medium">Agents on this deal</legend>
          <p className="text-sm text-(--cl-dark-blue)/70">
            You're added automatically. Add colleagues here only if this deal is
            shared -- otherwise leave this section empty.
          </p>

          {coAgents.length > 0 && (
            <label className="flex gap-1 justify-between items-center">
              Your split (%)
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={mySplitPct}
                onChange={(e) => setMySplitPct(e.target.value)}
              />
            </label>
          )}

          {coAgents.map((agent, index) => (
            <div
              key={index}
              className="flex gap-2 items-center border rounded p-3"
            >
              <select
                value={agent.agentId}
                onChange={(e) =>
                  updateCoAgent(index, "agentId", e.target.value)
                }
                className="flex-1"
              >
                <option value="" disabled>
                  Select a colleague…
                </option>
                {availableAgentsFor(index).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Split %"
                value={agent.splitPct}
                onChange={(e) =>
                  updateCoAgent(index, "splitPct", e.target.value)
                }
                className="w-24"
              />
              <button
                type="button"
                onClick={() => removeCoAgentRow(index)}
                className="text-sm underline"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addCoAgentRow}
            className="self-start text-sm underline"
          >
            + Add another agent
          </button>
        </fieldset>

        <fieldset id="attorney-bond" className="flex flex-col gap-2">
          <legend className="font-medium">Attorney & bond</legend>
          <AttorneyPicker value={attorneyId} onChange={setAttorneyId} />
          <input
            type="text"
            placeholder="Bond details..."
            value={bondDetails}
            onChange={(e) => setBondDetails(e.target.value)}
          />
        </fieldset>

        <fieldset id="commission" className="flex flex-col gap-2">
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
          <label className="flex gap-1 justify-between items-center">
            Expected close date
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </label>
        </fieldset>

        {/* Error block — all errors shown together just above submit */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm flex flex-col gap-1">
            {errors.map((err) => (
              <p key={err}>• {err}</p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
        >
          {submitting ? "Creating…" : "Create Deal"}
        </button>
      </form>

      {duplicateDialogIndex !== null &&
        duplicateByIndex.get(duplicateDialogIndex) && (
          <ConfirmDialog
            open={true}
            title="Client already exists"
            message={`A client named "${duplicateByIndex.get(duplicateDialogIndex)?.name}" already exists${
              duplicateByIndex.get(duplicateDialogIndex)?.email
                ? ` (${duplicateByIndex.get(duplicateDialogIndex)?.email})`
                : ""
            }. Use their existing details, or create a new record?`}
            confirmLabel="Use existing"
            cancelLabel="Create new"
            onConfirm={() =>
              handleUseExistingClient(
                duplicateDialogIndex,
                duplicateByIndex.get(duplicateDialogIndex)!,
              )
            }
            onCancel={() => handleCreateNewClient(duplicateDialogIndex)}
          />
        )}
    </div>
  );
}

export default NewDeal;
