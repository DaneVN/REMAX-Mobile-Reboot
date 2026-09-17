import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import {
  listAttorneys,
  createAttorney,
  getMyDefaultAttorneyId,
  setMyDefaultAttorney,
  type Attorney,
} from "../../lib/attorneys";

const ADD_NEW_VALUE = "__add_new__";

interface AttorneyPickerProps {
  value: string; // selected attorney id, or "" for none
  onChange: (attorneyId: string) => void;
}

function AttorneyPicker({ value, onChange }: AttorneyPickerProps) {
  const { session } = useAuth();
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [defaultAttorneyId, setDefaultAttorneyId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newFirmName, setNewFirmName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  // Only auto-apply the agent's default once, and only if nothing is
  // already selected -- never override a value the form already has
  // (e.g. when editing an existing deal that has its own attorney set).
  const hasAppliedDefault = useRef(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    Promise.all([listAttorneys(), getMyDefaultAttorneyId(session.user.id)])
      .then(([attorneyList, defaultId]) => {
        if (cancelled) return;
        setAttorneys(attorneyList);
        setDefaultAttorneyId(defaultId);

        if (!hasAppliedDefault.current && !value && defaultId) {
          hasAppliedDefault.current = true;
          onChange(defaultId);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load attorneys:", err);
        setError("Couldn't load the attorney directory.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === ADD_NEW_VALUE) {
      setAddingNew(true);
      return;
    }
    onChange(e.target.value);
  }

  // Prevents Enter from bubbling up to the outer deal form and submitting it.
  // Must be on each <input> individually -- preventDefault() on a wrapping
  // <div>'s onKeyDown does not stop the browser's native form-submit behavior.
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNew();
    }
  }

  async function handleAddNew() {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError("Attorney name is required.");
      return;
    }

    setError(null);
    setSavingNew(true);

    try {
      const newId = await createAttorney(
        trimmedName,
        newContact.trim() || undefined,
        newFirmName.trim() || undefined,
      );
      const refreshed = await listAttorneys();
      setAttorneys(refreshed);
      onChange(newId);
      setAddingNew(false);
      setNewName("");
      setNewContact("");
      setNewFirmName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add attorney.");
    } finally {
      setSavingNew(false);
    }
  }

  async function handleDefaultToggle(checked: boolean) {
    if (!session) return;
    try {
      await setMyDefaultAttorney(session.user.id, checked ? value : null);
      setDefaultAttorneyId(checked ? value : null);
    } catch (err) {
      console.error("Failed to update default attorney:", err);
    }
  }

  const selected = attorneys.find((a) => a.id === value);

  if (loading)
    return (
      <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
    );

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!addingNew && (
        <>
          <select value={value} onChange={handleSelectChange}>
            <option value="">No attorney selected</option>
            {attorneys.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.firmName ? ` (${a.firmName})` : ""}
              </option>
            ))}
            <option value={ADD_NEW_VALUE}>+ Add new attorney…</option>
          </select>

          {selected?.contact && (
            <p className="text-sm text-(--cl-dark-blue)/70">
              {selected.contact}
            </p>
          )}

          {value && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={defaultAttorneyId === value}
                onChange={(e) => handleDefaultToggle(e.target.checked)}
              />
              Set as my default attorney
            </label>
          )}
        </>
      )}

      {addingNew && (
        <div className="flex flex-col gap-2 border rounded p-3">
          <span className="font-medium text-sm">Add a new attorney</span>
          <input
            type="text"
            placeholder="Name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <input
            type="text"
            placeholder="Contact (email and/or phone)..."
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <input
            type="text"
            placeholder="Firm name..."
            value={newFirmName}
            onChange={(e) => setNewFirmName(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddNew}
              disabled={savingNew}
              className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
            >
              {savingNew ? "Adding…" : "Add attorney"}
            </button>
            <button
              type="button"
              onClick={() => setAddingNew(false)}
              className="bg-(--cl-base-dark) text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttorneyPicker;
