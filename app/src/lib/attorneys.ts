import { supabase } from "./supabaseClient";

export type Attorney = {
  id: string;
  name: string;
  contact: string | null;
  firmName: string | null;
};

// ---------------------------------------------------------------------------
// The shared, office-wide attorney directory -- every attorney any agent
// has ever added, available to everyone for reuse.
// ---------------------------------------------------------------------------
export async function listAttorneys(): Promise<Attorney[]> {
  const { data, error } = await supabase
    .from("attorneys")
    .select("id, name, contact, firm_name")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    contact: row.contact,
    firmName: row.firm_name,
  }));
}

export async function createAttorney(
  name: string,
  contact?: string,
  firmName?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("attorneys")
    .insert({ name, contact, firm_name: firmName })
    .select()
    .single();

  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Each agent's personal preferred-default attorney, stored on their own
// profiles row. Not shared -- purely a per-agent convenience.
// ---------------------------------------------------------------------------
export async function getMyDefaultAttorneyId(
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("default_attorney_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data?.default_attorney_id ?? null;
}

export async function setMyDefaultAttorney(
  userId: string,
  attorneyId: string | null,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ default_attorney_id: attorneyId })
    .eq("id", userId);

  if (error) throw error;
}
