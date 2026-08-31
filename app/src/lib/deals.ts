import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NewClientInput = {
  name: string;
  email?: string;
  phone?: string;
  type: "buyer" | "seller" | "tenant";
};

type NewDealInput = {
  agentId: string;
  propertyAddress: string;
  dealType: "sale" | "rental";
  representing: "seller" | "buyer" | "rental"; // decides which task template / board is used
  sellerClients?: NewClientInput[];
  buyerClients?: NewClientInput[]; // also used for tenants on rental deals
  attorneyName?: string;
  attorneyContact?: string;
  bondDetails?: string;
  listingPrice?: number;
  purchasePrice?: number;
  expectedCommission?: number;
  commissionSplitPct?: number;
  expectedCloseDate?: string; // ISO date
};

export type UpdateDealInput = Partial<{
  propertyAddress: string;
  dealType: "sale" | "rental";
  status: "active" | "closed" | "fell_through";
  attorneyName: string;
  attorneyContact: string;
  bondDetails: string;
  listingPrice: number;
  purchasePrice: number;
  expectedCommission: number;
  commissionSplitPct: number;
  expectedCloseDate: string;
}>;

export type DealClient = {
  id: string; // deal_clients row id
  clientId: string;
  role: "seller" | "buyer";
  name: string;
  email: string | null;
  phone: string | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function insertClient(client: NewClientInput) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id as string;
}

async function insertClients(clients: NewClientInput[] | undefined) {
  if (!clients || clients.length === 0) return [];
  const ids: string[] = [];
  for (const client of clients) {
    ids.push(await insertClient(client));
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Create -- deal + board + tasks + client links, atomically, via RPC
// ---------------------------------------------------------------------------

export async function createDealWithBoard(input: NewDealInput) {
  const sellerClientIds = await insertClients(input.sellerClients);
  const buyerClientIds = await insertClients(input.buyerClients);

  const { data, error } = await supabase.rpc("create_deal_with_board", {
    p_agent_id: input.agentId,
    p_property_address: input.propertyAddress,
    p_deal_type: input.dealType,
    p_representing: input.representing,
    p_seller_client_ids: sellerClientIds,
    p_buyer_client_ids: buyerClientIds,
    p_attorney_name: input.attorneyName ?? null,
    p_attorney_contact: input.attorneyContact ?? null,
    p_bond_details: input.bondDetails ?? null,
    p_listing_price: input.listingPrice ?? null,
    p_purchase_price: input.purchasePrice ?? null,
    p_expected_commission: input.expectedCommission ?? null,
    p_commission_split_pct: input.commissionSplitPct ?? null,
    p_expected_close_date: input.expectedCloseDate ?? null,
  });

  if (error) throw error;

  const result = data?.[0];
  if (!result) throw new Error("Deal creation did not return an id.");

  return {
    dealId: result.deal_id as string,
    boardId: result.board_id as string,
  };
}

// ---------------------------------------------------------------------------
// Read -- clients linked to a deal, split by role. Used by Edit Deal / Pipeline.
// ---------------------------------------------------------------------------

export async function getDealClients(dealId: string): Promise<DealClient[]> {
  const { data, error } = await supabase
    .from("deal_clients")
    .select(
      `
      id,
      role,
      client_id,
      clients ( name, email, phone )
    `,
    )
    .eq("deal_id", dealId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    role: row.role,
    name: row.clients?.name ?? "",
    email: row.clients?.email ?? null,
    phone: row.clients?.phone ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Add / remove individual clients on an existing deal
// ---------------------------------------------------------------------------

export async function addClientToDeal(
  dealId: string,
  role: "seller" | "buyer",
  client: NewClientInput,
) {
  const clientId = await insertClient(client);

  const { error } = await supabase
    .from("deal_clients")
    .insert({ deal_id: dealId, client_id: clientId, role });

  if (error) throw error;
  return clientId;
}

export async function removeClientFromDeal(dealClientRowId: string) {
  const { error } = await supabase
    .from("deal_clients")
    .delete()
    .eq("id", dealClientRowId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Update -- deal-level fields only (unrelated to client links)
// ---------------------------------------------------------------------------

export async function updateDeal(dealId: string, input: UpdateDealInput) {
  const { error } = await supabase
    .from("deals")
    .update({
      property_address: input.propertyAddress,
      deal_type: input.dealType,
      status: input.status,
      attorney_name: input.attorneyName,
      attorney_contact: input.attorneyContact,
      bond_details: input.bondDetails,
      listing_price: input.listingPrice,
      purchase_price: input.purchasePrice,
      expected_commission: input.expectedCommission,
      commission_split_pct: input.commissionSplitPct,
      expected_close_date: input.expectedCloseDate,
    })
    .eq("id", dealId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Archive (soft delete) -- available to the owning agent.
// ---------------------------------------------------------------------------

export async function archiveDeal(dealId: string) {
  const { error } = await supabase
    .from("deals")
    .update({ is_deleted: true })
    .eq("id", dealId);

  if (error) throw error;
}

export async function restoreDeal(dealId: string) {
  const { error } = await supabase
    .from("deals")
    .update({ is_deleted: false })
    .eq("id", dealId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hard delete -- admin only. RLS enforces this server-side.
// ---------------------------------------------------------------------------

export async function deleteDealPermanently(dealId: string) {
  const { error } = await supabase.from("deals").delete().eq("id", dealId);

  if (error) throw error;
}
