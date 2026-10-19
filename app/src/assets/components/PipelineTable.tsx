export default function PipelineTable() {
  // Sample Data
  const data = [
    {
      id: "df5c6b79-a29e-483b-bdff-f3b7b7aa97d0",
      property_address: "69 Westview Drive, Mill Park",
      deal_type: "sale",
      status: "active",
      bond_details: null,
      expected_commission: 4.0,
      commission_split_pct: 100.0,
      paye_amount: null,
      expected_close_date: null,
      created_at: "2026-09-29 09:15:04.814162+00",
      listing_price: 2350000.0,
      purchase_price: 2300000.0,
      is_deleted: false,
      attorney_id: "0775658d-65d2-4926-96cd-804674a74620",
      created_by: "519431c6-d4e4-4d69-8583-1530d56b76ac",
      representing: "seller",
    },
    {
      id: "5225a4f9-8d21-4bcf-aed2-dca03ed76a12",
      property_address: "2 The Hamptons, Lorraine",
      deal_type: "sale",
      status: "closed",
      bond_details: null,
      expected_commission: null,
      commission_split_pct: null,
      paye_amount: null,
      expected_close_date: null,
      created_at: "2026-09-11 08:48:30.784757+00",
      listing_price: 2699000.0,
      purchase_price: 2550000.0,
      is_deleted: false,
      attorney_id: null,
      created_by: "ec40503a-393b-4c47-aea7-efc3cda6f2fe",
      representing: "seller",
    },
  ];

  return (
    <table
      border={1}
      style={{
        borderCollapse: "collapse",
        width: "100%",
        textAlign: "start",
        fontSize: "14px",
      }}
    >
      <thead>
        {/* Level 1 Header */}
        <tr
          style={{
            backgroundColor: "#fdf0d5",
            border: "1px solid #000",
          }}
        >
          <th rowSpan={2}>Property Address</th>
          <th rowSpan={2}>Status</th>
          <th colSpan={5}>Dates</th>
          <th colSpan={7}>Financials</th>
        </tr>
        {/* Level 2 Header */}
        <tr
        //   style={{
        //     backgroundColor: "#fdf0d5",
        //     borderBlock: "1px solid #000",
        //   }}
        >
          <th>Listing Date</th>
          {/* <th>Sale Date</th> */}
          {/* <th>Days On Market</th> */}
          {/* <th>Lodge Date</th> */}
          <th>Registration Date</th>
          <th>Listing Price</th>
          <th>Purchase Price</th>
          <th>Commission</th>
          <th>Split %</th>
          <th>PAYE Amount</th>
          <th>Archived</th>
          <th>Attorney ID</th>
          <th>Created By</th>
          <th>Representing</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <td>{row.property_address}</td>
            {/* <td>{row.deal_type}</td> */}
            <td>{row.status}</td>
            <td>{row.created_at}</td>
            <td>{row.expected_close_date}</td>
            <td>R{row.listing_price.toFixed(2)}</td>
            <td>R{row.purchase_price.toFixed(2)}</td>
            {/* <td>{row.bond_details}</td> */}
            <td>{row.expected_commission}</td>
            <td>{row.commission_split_pct}</td>
            <td>{row.paye_amount}</td>
            <td>{row.is_deleted}</td>
            <td>{row.attorney_id}</td>
            <td>{row.created_by}</td>
            <td>{row.representing}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
