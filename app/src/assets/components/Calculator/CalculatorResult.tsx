import { AgentCommission } from "../../utils/CommissionCalculator";
import type { CalculatorData } from "./CalculatorCard";

type CalculatorResultData = Record<string, string>;

type CalculatorResultProps = {
  calculatorData: CalculatorData;
};

// Display labels, keyed by the field names AgentCommission returns. Each label
// says what the number actually is -- in particular, the Unity split is applied
// to "Commission excl. VAT", NOT to "excl. VAT less royalty" (royalty is taken
// off after the split). The formula itself lives in CommissionCalculator.js.
function labelFor(key: string, d: CalculatorData): string {
  switch (key) {
    case "purchasePrice":
      return "Purchase price";
    case "commissionPercentage":
      return "Your commission rate (incl. VAT)";
    case "grossCommission":
      return "Gross commission (incl. VAT)";
    case "lessVAT":
      return "Less VAT (15%)";
    case "totalAfterVAT":
      return "Commission excl. VAT (office split is applied to this)";
    case "royalty":
      return `Royalty (${d.royalty}% of commission excl. VAT)`;
    case "totalAfterRoyalty":
      return "Commission excl. VAT, less royalty (for reference only - not used in the split)";
    case "totalAfterSplitWithUnity":
      return `Your share after ${d.unitySplit}% office split and royalty`;
    case "PAYE":
    case "paye":
      return `PAYE (${d.paye}% of your share)`;
    case "nettPaymentToAgent":
      return "Nett payment to you";
    default:
      return key.replace(/([A-Z])/g, " $1").toLowerCase();
  }
}

/**
 * CalculatorResult Component
 * Displays the results of the calculator in a formatted list.
 * @param {Object} calculatorData - The data to display, containing various calculated values.
 * @returns {JSX.Element} The rendered calculator result component.
 */
export default function CalculatorResult({
  calculatorData,
}: CalculatorResultProps) {
  const calculatedData: CalculatorResultData | null =
    calculatorData.purchasePrice > 0 ? AgentCommission(calculatorData) : null;

  return (
    <div className="w-full max-w-2xl my-4 p-4 rounded shadow-md">
      <h3 className="text-2xl font-bold mb-4">Calculation Results</h3>
      {calculatorData.purchasePrice > 0 && calculatedData ? (
        <ul className="space-y-2">
          {Object.entries(calculatedData).map(([key, value]) => (
            <li
              key={key}
              className="flex justify-between border-b border-b-white w-full"
            >
              <span className="font-semibold">
                {labelFor(key, calculatorData)}:
              </span>
              <span>{value || "-"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <h4 className="text-xl text-center">
          No result available. Please enter values in the calculator.
        </h4>
      )}
    </div>
  );
}
