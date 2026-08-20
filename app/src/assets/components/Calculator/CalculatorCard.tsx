import { useState } from "react";
import CalculatorResult from "./CalculatorResult";

export type CalculatorData = {
  purchasePrice: number;
  commissionOnPurchasePrice: number;
  agentSplit: number;
  vatOnAgentSplit: "excl." | "incl.";
  grossCommision: number;
  vat: number;
  royalty: number;
  unitySplit: number;
  paye: number;
};

const initialCalculatorData: CalculatorData = {
  purchasePrice: 0,
  commissionOnPurchasePrice: 0,
  agentSplit: 0,
  vatOnAgentSplit: "excl.",
  grossCommision: 0,
  vat: 0,
  royalty: 0,
  unitySplit: 0,
  paye: 0,
};

function getNumber(formData: FormData, fieldName: string): number {
  const value = formData.get(fieldName);
  return typeof value === "string" && value !== "" ? Number(value) : 0;
}

export default function CalculatorCard() {
  const [calculatorData, setCalculatorData] = useState<CalculatorData>(
    initialCalculatorData,
  );
  const [hasFixedGrossAmount, setHasFixedGrossAmount] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setCalculatorData({
      ...initialCalculatorData,
      purchasePrice: getNumber(formData, "purchasePrice"),
      grossCommision: hasFixedGrossAmount
        ? getNumber(formData, "grossCommision")
        : 0,
      commissionOnPurchasePrice: hasFixedGrossAmount
        ? 0
        : getNumber(formData, "commissionOnPurchasePrice"),
      agentSplit: hasFixedGrossAmount ? 0 : getNumber(formData, "agentSplit"),
      royalty: getNumber(formData, "royalty"),
      unitySplit: getNumber(formData, "unitySplit"),
      paye: getNumber(formData, "paye"),
    });
  };

  return (
    <section
      id="calculator"
      className="p-2.5 rounded-[15px] sm:grid sm:grid-cols-2 text-(--cl-base-dark)"
    >
      <div className="flex flex-col items-top justify-top">
        <h3 className="justify-self-center text-2xl font-bold mb-4">
          Commission Calculator:
        </h3>
        <div className="flex flex-col items-center justify-center h-full">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="flex flex-col items-start justify-center gap-4">
              <label className="text-lg font-semibold">
                Purchase Price:
                <input
                  required
                  name="purchasePrice"
                  type="number"
                  className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                  placeholder="..."
                  min={0}
                />
              </label>
              <label className="text-lg font-semibold">
                Has Fixed Gross Amount:
                <input
                  name="hasFixedGrossAmount"
                  type="checkbox"
                  checked={hasFixedGrossAmount}
                  className="ml-2"
                  onChange={(event) =>
                    setHasFixedGrossAmount(event.currentTarget.checked)
                  }
                />
              </label>
              <div
                className={`flex flex-col items-start justify-center gap-4 ${
                  hasFixedGrossAmount ? "hidden" : ""
                }`}
              >
                <label className="text-lg font-semibold">
                  % Commision on Purchase Price:
                  <input
                    name="commissionOnPurchasePrice"
                    type="number"
                    className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                    placeholder="..."
                    min={0}
                  />{" "}
                  %
                </label>
                <label className="text-lg font-semibold">
                  % Commission to you:{" "}
                  <input
                    name="agentSplit"
                    className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                    placeholder="..."
                    min={0}
                  />{" "}
                  %
                </label>
              </div>

              <label
                className={`text-lg font-semibold ${
                  hasFixedGrossAmount ? "" : "hidden"
                }`}
              >
                Gross Commision:{" "}
                <input
                  name="grossCommision"
                  type="number"
                  className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                  placeholder="..."
                  min={0}
                />
              </label>
              <hr />

              <label className="text-lg font-semibold">
                Royalty:{" "}
                <select
                  name="royalty"
                  className="mt-2 p-2 rounded border border-gray-300 block"
                >
                  <option value={1.5} className="text-black">
                    1.5%
                  </option>
                  <option value={5} className="text-black">
                    5.0%
                  </option>
                </select>
              </label>

              <label className="text-lg font-semibold">
                Unity Office Split:{" "}
                <select
                  name="unitySplit"
                  className="mt-2 p-2 rounded border border-gray-300"
                >
                  <option value={50} className="text-black">
                    50|50
                  </option>
                  <option value={90} className="text-black">
                    90|10
                  </option>
                  <option value={70} className="text-black">
                    70|30
                  </option>
                </select>
              </label>

              <label className="text-lg font-semibold">
                PAYE:{" "}
                <input
                  required
                  name="paye"
                  type="number"
                  className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                  placeholder="..."
                  defaultValue={18}
                  min={0}
                />{" "}
                %
              </label>

              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded active:bg-blue-600 transition-colors"
              >
                Calculate
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center h-full">
        <CalculatorResult calculatorData={calculatorData} />
      </div>
    </section>
  );
}
