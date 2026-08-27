import { supabase } from "./supabaseClient";

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
  percentCommission?: number;
  commissionSplitPct?: number;
  expectedCloseDate?: string; // ISO date
};

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

export async function createDealWithBoard(input: NewDealInput) {
  // Client rows are still a separate step — creating a person record is a
  // distinct concern from the deal itself, and a leftover client row (in the
  // rare case this step succeeds but the deal step below fails) is a much
  // lower-risk orphan than a deal with no board ever was.
  const sellerClientId = input.sellerClient
    ? await insertClient(input.sellerClient)
    : null;
  const buyerClientId = input.buyerClient
    ? await insertClient(input.buyerClient)
    : null;

  // Deal + board + tasks are created together, atomically, in one DB transaction.
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
    p_percent_commission: input.percentCommission ?? null,
    p_commission_split_pct: input.commissionSplitPct ?? null,
    p_expected_close_date: input.expectedCloseDate ?? null,
  });

  if (error) throw error;

  // rpc() with a `returns table (...)` function comes back as an array of rows
  const result = data?.[0];
  if (!result) throw new Error("Deal creation did not return an id.");

  return {
    dealId: result.deal_id as string,
    boardId: result.board_id as string,
  };
}
