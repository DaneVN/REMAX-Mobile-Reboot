import { useState } from "react";
import CalculatorResult from "./CalculatorResult";
import { validateAmount, validatePercent } from "../../../lib/validators";

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
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const raw = (name: string) => {
      const v = formData.get(name);
      return typeof v === "string" ? v : "";
    };
    const found: string[] = [];
    const add = (msg: string | null) => msg && found.push(msg);

    add(
      validateAmount(raw("purchasePrice"), "Purchase price", {
        required: true,
      }),
    );
    if (
      Number(raw("purchasePrice")) === 0 &&
      raw("purchasePrice").trim() !== ""
    )
      found.push("Purchase price must be greater than 0.");
    if (hasFixedGrossAmount) {
      add(
        validateAmount(raw("grossCommision"), "Gross commission", {
          required: true,
        }),
      );
      if (
        Number(raw("grossCommision")) === 0 &&
        raw("grossCommision").trim() !== ""
      )
        found.push("Gross commission must be greater than 0.");
    } else {
      add(
        validatePercent(raw("commissionOnPurchasePrice"), "Commission %", {
          required: true,
        }),
      );
      add(
        validatePercent(raw("agentSplit"), "% Commission to you", {
          required: true,
        }),
      );
    }
    add(validatePercent(raw("paye"), "PAYE", { required: true }));

    setErrors(found);
    if (found.length > 0) return;

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
          <form onSubmit={handleSubmit} noValidate className="w-full max-w-2xl">
            <div className="flex flex-col items-start justify-center gap-4">
              <label className="text-lg font-semibold">
                Purchase Price:
                <input
                  required
                  step="0.01"
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
                  step="0.01"
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
                  Comm % excluding VAT (on OTP):
                  <input
                    name="commissionOnPurchasePrice"
                    type="number"
                    className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                    placeholder="..."
                    defaultValue={5}
                    step="0.01"
                    min={0}
                    max={100}
                  />
                </label>
                <label className="text-lg font-semibold">
                  % Commission to you:{" "}
                  <input
                    name="agentSplit"
                    className="mt-2 p-2 rounded border border-gray-300 w-11/12"
                    placeholder="..."
                    defaultValue={100}
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                  />
                </label>
              </div>

              <label
                className={`text-lg font-semibold ${
                  hasFixedGrossAmount ? "" : "hidden"
                }`}
              >
                Gross Commission (incl. VAT, your full amount):{" "}
                <input
                  name="grossCommision"
                  step="0.01"
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
                  step="0.01"
                  min={0}
                  max={100}
                />{" "}
                %
              </label>

              {errors.length > 0 && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm flex flex-col gap-1"
                >
                  {errors.map((err) => (
                    <p key={err}>• {err}</p>
                  ))}
                </div>
              )}

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
