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
  sellerClient?: NewClientInput;
  buyerClient?: NewClientInput;
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

// ---------------------------------------------------------------------------
// Internal helper
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

// ---------------------------------------------------------------------------
// Create -- deal + board + tasks, atomically, via the create_deal_with_board RPC
// ---------------------------------------------------------------------------

export async function createDealWithBoard(input: NewDealInput) {
  const sellerClientId = input.sellerClient
    ? await insertClient(input.sellerClient)
    : null;
  const buyerClientId = input.buyerClient
    ? await insertClient(input.buyerClient)
    : null;

  const { data, error } = await supabase.rpc("create_deal_with_board", {
    p_agent_id: input.agentId,
    p_property_address: input.propertyAddress,
    p_deal_type: input.dealType,
    p_representing: input.representing,
    p_seller_client_id: sellerClientId,
    p_buyer_client_id: buyerClientId,
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
// Update -- used by the Edit Deal form.
// RLS ("agents update their own deals" / "admins update all deals") governs
// who this actually succeeds for -- no role check needed client-side.
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
// Archive (soft delete) -- available to the owning agent. Just flips a flag; the row
// (and its board/tasks/history) stays intact, it's just filtered out of
// normal views (see WorkflowIndex's query, which excludes is_deleted).
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
// Hard delete -- admin only. RLS enforces this server-side (the "admins
// delete deals" policy); a non-admin calling this gets an RLS error back,
// not a silent no-op, so always surface `error` to the user.
// ---------------------------------------------------------------------------

export async function deleteDealPermanently(dealId: string) {
  const { error } = await supabase.from("deals").delete().eq("id", dealId);

  if (error) throw error;
}
