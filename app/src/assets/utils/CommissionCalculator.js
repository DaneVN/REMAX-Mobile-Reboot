const VAT = 15 / 100;

/* * Commission Calculator for Real Estate Agents
 * This function calculates the commission for real estate agents based on the purchase price,
 * commission percentage, agent split, royalty, unity split, and PAYE.
 * @param {Object} data - The input data containing the necessary parameters.
 * @returns {Object} - An object containing the calculated commission details.
 * @property {string} purchasePrice - The purchase price of the property.
 * @property {string} commissionPercentage - The percentage of the commission.
 * @property {string} grossCommission - The total gross commission amount.
 * @property {string} vatOnGrossCommission - The VAT amount on the gross commission.
 * @property {string} totalAfterVat - The total amount after VAT deduction.
 * @property {string} royalty - The royalty amount deducted from the total after VAT.
 * @property {string} totalAfterRoyalty - The total amount after royalty deduction.
 * @property {string} unitySplit - The agent's share after royalty deduction.
 * @property {string} paye - The PAYE amount deducted from the unity split.
 * @property {string} nettPaymentToAgent - The final payment to the agent after PAYE deduction.
 */

export function AgentCommission(data) {
  //logic for commission on purchase price
  if (!data.grossCommision) {
    const purchasePrice = data.purchasePrice;
    const vatOnAgentSplit = data.commissionOnPurchasePrice * (VAT + 1);

    const commisionFactor =
      parseFloat(vatOnAgentSplit / 100) * (data.agentSplit / 100);

    const grossCommission = purchasePrice * commisionFactor;

    const lessVat = grossCommission - (grossCommission / (1 + VAT)).toFixed(2);

    const totalAfterVat = grossCommission - lessVat;
    const royalty = totalAfterVat * (data.royalty / 100);
    const totalAfterRoyalty = (totalAfterVat - royalty).toFixed(2);

    const unitySplit = totalAfterVat * (data.unitySplit / 100) - royalty;

    const paye = unitySplit * (data.paye / 100);
    //return results in object format
    return {
      purchasePrice: parseFloat(purchasePrice).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      commissionPercentage: (commisionFactor * 100).toFixed(3) + "%",
      grossCommission: parseFloat(grossCommission).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      lessVAT: parseFloat(lessVat).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterVAT: parseFloat(totalAfterVat).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      royalty: parseFloat(royalty).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterRoyalty: parseFloat(totalAfterRoyalty).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterSplitWithUnity: parseFloat(unitySplit).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      PAYE: parseFloat(paye).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      nettPaymentToAgent: parseFloat(unitySplit - paye).toLocaleString(
        "en-ZA",
        { style: "currency", currency: "ZAR" }
      ),
    };
  } else {
    //logic for fixed gross commission
    const grossCommission = data.grossCommision;
    const lessVat = grossCommission - grossCommission / (1 + VAT);
    const totalAfterVat = (grossCommission - lessVat).toFixed(2);
    const royalty = totalAfterVat * (data.royalty / 100);
    const totalAfterRoyalty = (totalAfterVat - royalty).toFixed(2);

    const unitySplit = (
      totalAfterVat * (data.unitySplit / 100) -
      royalty
    ).toFixed(2);

    const paye = unitySplit * (data.paye / 100);
    //return results in object format
    return {
      purchasePrice: parseFloat(data.purchasePrice).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      grossCommission: parseFloat(grossCommission).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      lassVAT: parseFloat(lessVat).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterVAT: parseFloat(totalAfterVat).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      royalty: parseFloat(royalty).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterRoyalty: parseFloat(totalAfterRoyalty).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalAfterSplitWithUnity: parseFloat(unitySplit).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      paye: parseFloat(paye).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      nettPaymentToAgent: parseFloat(unitySplit - paye).toLocaleString(
        "en-ZA",
        {
          style: "currency",
          currency: "ZAR",
        }
      ),
    };
  }
}
