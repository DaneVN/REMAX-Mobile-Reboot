import { useState, useEffect } from "react";
import { AgentCommission } from "../../utils/CommissionCalculator.js";
/* * CalculatorResult Component
 * Displays the results of the calculator in a formatted list.
 * @param {Object} calculatorData - The data to display, containing various calculated values.
 */
export default function CalculatorResult({ calculatorData }) {
  const [isHidden, setIsHidden] = useState(calculatorData.purchasePrice === 0);
  const [calculatedData, setCalculatedData] = useState(null);

  useEffect(() => {
    setIsHidden(calculatorData.purchasePrice === 0);
    const newData = { ...AgentCommission(calculatorData) };
    setCalculatedData(newData);
  }, [calculatorData]);

  return (
    <div className="w-full max-w-2xl my-4 p-4 rounded shadow-md">
      <h3 className="text-2xl font-bold mb-4">Calculation Results</h3>
      {!isHidden ? (
        <ul className="space-y-2">
          {Object.entries(calculatedData).map(([key, value]) => (
            <li
              key={key}
              className="flex justify-between border-b border-b-white w-full"
            >
              <span className="font-semibold capitalize">
                {key.replace(/([A-Z])/g, " $1").toLowerCase()}:
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
