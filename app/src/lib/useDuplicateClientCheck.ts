import { useState } from "react";
import { supabase } from "./supabaseClient";

export type ExistingClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type DuplicateCheckState = {
  // The existing client found, or null if no duplicate
  existingClient: ExistingClient | null;
  // Whether the ConfirmDialog should be open
  dialogOpen: boolean;
  // Call this on the name input's onBlur -- returns true if a duplicate was
  // found (caller should hold off submitting until the dialog is resolved)
  checkName: (name: string) => Promise<boolean>;
  // Agent chose to use the existing client -- call onUseExisting with the id
  confirmUseExisting: () => void;
  // Agent chose to create a new client anyway
  confirmCreateNew: () => void;
  // Reset state (e.g. after a row is cleared or the form resets)
  reset: () => void;
};

type Options = {
  onUseExisting: (client: ExistingClient) => void;
  onCreateNew: () => void;
};

export function useDuplicateClientCheck({
  onUseExisting,
  onCreateNew,
}: Options): DuplicateCheckState {
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  async function checkName(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .ilike("name", trimmed) // case-insensitive exact match
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Duplicate client check failed:", error);
      return false;
    }

    if (!data) return false;

    setExistingClient({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
    });
    setDialogOpen(true);
    return true;
  }

  function confirmUseExisting() {
    if (existingClient) onUseExisting(existingClient);
    setDialogOpen(false);
  }

  function confirmCreateNew() {
    onCreateNew();
    setDialogOpen(false);
    setExistingClient(null);
  }

  function reset() {
    setExistingClient(null);
    setDialogOpen(false);
  }

  return {
    existingClient,
    dialogOpen,
    checkName,
    confirmUseExisting,
    confirmCreateNew,
    reset,
  };
}
