import { useEffect, useState } from "react";
import { getPipelineDeals, type PipelineDeal } from "../../lib/pipeline";
import { AgentCommission } from "../utils/CommissionCalculator";
import type { CalculatorData } from "../components/Calculator/CalculatorCard";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const SA_FY_START_MONTH = 2; // March = index 2 in JS Date (0-indexed)

const STAGE_LABELS: Record<number, string> = {
  1: "Listing",
  2: "Offer",
  3: "Sale",
  4: "Suspensive Conditions",
  5: "Lodging",
  6: "Registration",
  7: "Post-Transaction",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatZAR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return value.toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function domDays(listing: string | null, sale: string | null): string {
  if (!listing || !sale) return "—";
  const diff =
    (new Date(sale).getTime() - new Date(listing).getTime()) /
    (1000 * 60 * 60 * 24);
  if (isNaN(diff) || diff < 0) return "—";
  return `${Math.round(diff)}d`;
}

// ---------------------------------------------------------------------------
// Deduction settings (agent-wide defaults, editable via settings panel)
// ---------------------------------------------------------------------------

type DeductionSettings = {
  commissionPct: number; // % excl. VAT on purchase price
  agentSplitPct: number; // the agent's COMBINED split of total commission — internal
  // co-agent split × external agency split (see PipelineDeal.combinedAgentSplitPct)
  royaltyPct: number;
  officeSplitPct: number; // agent's share of the Unity office split %, e.g. 50 for 50|50 —
  // a SEPARATE deduction from agentSplitPct, applied after VAT/royalty
  payePct: number;
};

// Build a CalculatorData object and run it through the canonical AgentCommission function.
// unitySplit in CalculatorData = the Unity office split (a separate % from agentSplit),
// matching the Calculator's "Unity Office Split" field.
function calculateNett(purchasePrice: number, settings: DeductionSettings) {
  const data: CalculatorData = {
    purchasePrice,
    commissionOnPurchasePrice: settings.commissionPct,
    agentSplit: settings.agentSplitPct,
    vatOnAgentSplit: "excl.",
    grossCommision: 0, // use purchase-price path
    vat: 15,
    royalty: settings.royaltyPct,
    unitySplit: settings.officeSplitPct,
    paye: settings.payePct,
  };
  return AgentCommission(data);
}

// ---------------------------------------------------------------------------
// Year range helpers
// ---------------------------------------------------------------------------

type YearType = "calendar" | "financial";

function getYearBounds(
  yearType: YearType,
  reference: Date,
): { start: Date; end: Date; label: string } {
  if (yearType === "calendar") {
    const y = reference.getFullYear();
    return {
      start: new Date(y, 0, 1),
      end: new Date(y, 11, 31, 23, 59, 59),
      label: `${y}`,
    };
  }
  // SA financial year: March 1 – Feb 28/29
  const m = reference.getMonth();
  const y = reference.getFullYear();
  const fyStart = m >= SA_FY_START_MONTH ? y : y - 1;
  return {
    start: new Date(fyStart, SA_FY_START_MONTH, 1),
    end: new Date(fyStart + 1, SA_FY_START_MONTH - 1 + 1, 0, 23, 59, 59),
    label: `FY ${fyStart}/${String(fyStart + 1).slice(-2)}`,
  };
}

function isInYear(
  isoDate: string | null,
  bounds: { start: Date; end: Date },
): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  return d >= bounds.start && d <= bounds.end;
}

// Which month index does a deal's close date fall in (for cashflow)?
function cashflowMonthIndex(
  isoDate: string | null,
  yearType: YearType,
): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (yearType === "calendar") {
    return d.getMonth(); // 0-11
  }
  // SA FY: March=0 … Feb=11
  const m = d.getMonth(); // 0-11
  return ((m - SA_FY_START_MONTH + 12) % 12) as number;
}

// ---------------------------------------------------------------------------
// Cashflow month header labels
// ---------------------------------------------------------------------------

function getCashflowHeaders(yearType: YearType): string[] {
  if (yearType === "calendar") return MONTHS;
  // FY: Mar … Feb
  const fyMonths = [...MONTHS.slice(2), ...MONTHS.slice(0, 2)];
  return fyMonths;
}

// ---------------------------------------------------------------------------
// Row-level editable overrides (stored in local state, not DB)
// ---------------------------------------------------------------------------

type RowOverride = {
  lodgeDate: string;
  regDate: string;
  commissionPct: string;
};

// ---------------------------------------------------------------------------
// Default deduction settings (agent-wide, editable via settings panel)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: DeductionSettings = {
  commissionPct: 5,
  agentSplitPct: 100,
  royaltyPct: 1.5,
  officeSplitPct: 50,
  payePct: 18,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Pipeline() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [yearType, setYearType] = useState<YearType>("calendar");
  const [settings, setSettings] = useState<DeductionSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, RowOverride>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {},
  );

  // Year navigation
  const today = new Date();
  const [refDate, setRefDate] = useState(today);
  const bounds = getYearBounds(yearType, refDate);
  const cashflowHeaders = getCashflowHeaders(yearType);

  useEffect(() => {
    getPipelineDeals()
      .then((d) => setDeals(d))
      .catch((e) => setError(e.message ?? "Failed to load pipeline"))
      .finally(() => setLoading(false));
  }, []);

  // Filter deals to those with an expectedCloseDate in the chosen year
  const filteredDeals = deals.filter((d) =>
    isInYear(d.expectedCloseDate, bounds),
  );

  // Per-deal effective settings (use row override commissionPct if set).
  // agentSplitPct is fed the deal's COMBINED split — internal co-agent split ×
  // external agency split — not just the internal split, since both reduce
  // what reaches this agent before the Unity office split applies.
  function effectiveSettings(deal: PipelineDeal): DeductionSettings {
    const ov = overrides[deal.id];
    const commPct = ov?.commissionPct
      ? parseFloat(ov.commissionPct)
      : (deal.expectedCommissionPct ?? settings.commissionPct);
    return {
      ...settings,
      commissionPct: isNaN(commPct) ? settings.commissionPct : commPct,
      agentSplitPct: deal.combinedAgentSplitPct,
    };
  }

  function getOverride(dealId: string): RowOverride {
    return (
      overrides[dealId] ?? {
        lodgeDate: "",
        regDate: "",
        commissionPct: "",
      }
    );
  }

  function setOverrideField(
    dealId: string,
    field: keyof RowOverride,
    value: string,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [dealId]: { ...getOverride(dealId), [field]: value },
    }));
  }

  // Parse a ZAR-formatted string back to a number for totals/cashflow
  function parseZAR(str: string): number {
    if (!str) return 0;
    const formatParts = new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).formatToParts(12345.6);
    const groupSeparator =
      formatParts.find((part) => part.type === "group")?.value ?? " ";
    const decimalSeparator =
      formatParts.find((part) => part.type === "decimal")?.value ?? ",";
    const normalized = str
      .split(groupSeparator)
      .join("")
      .replace(/[\s\u00a0\u202f]/g, "")
      .replace(decimalSeparator, ".")
      .replace(/[^0-9.-]/g, "");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  }

  function toggleCard(dealId: string) {
    setExpandedCards((prev) => ({ ...prev, [dealId]: !prev[dealId] }));
  }

  // Totals
  const totalNett = filteredDeals.reduce((sum, d) => {
    if (!d.purchasePrice) return sum;
    const result = calculateNett(d.purchasePrice, effectiveSettings(d));
    return sum + parseZAR(result.nettPaymentToAgent);
  }, 0);

  // Cashflow: nett by month index
  const cashflowByMonth: number[] = Array(12).fill(0);
  filteredDeals.forEach((d) => {
    if (!d.purchasePrice) return;
    const idx = cashflowMonthIndex(d.expectedCloseDate, yearType);
    if (idx == null) return;
    const result = calculateNett(d.purchasePrice, effectiveSettings(d));
    cashflowByMonth[idx] += parseZAR(result.nettPaymentToAgent);
  });

  // Year navigation
  function shiftYear(dir: 1 | -1) {
    const next = new Date(refDate);
    next.setFullYear(next.getFullYear() + dir);
    setRefDate(next);
  }

  // Input cell style
  const inputCls =
    "bg-transparent border-b border-(--cl-base) focus:border-(--cl-accent) focus:outline-none text-sm w-full py-0.5 text-(--cl-base-dark) placeholder:text-(--cl-base)";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-(--cl-base-dark)">
        Loading pipeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded bg-red-50 text-(--cl-accent-dark)">
        {error}
      </div>
    );
  }

  return (
    <div className="text-(--cl-base-dark)">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-around gap-3 mb-5">
        <h1 className="text-3xl font-bold text-(--cl-base-dark)">
          Commission Pipeline
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Year type toggle */}
          <div className="flex rounded overflow-hidden border border-(--cl-base) text-sm font-medium">
            <button
              onClick={() => setYearType("calendar")}
              className={`px-3 py-1.5 transition-colors ${
                yearType === "calendar"
                  ? "bg-(--cl-base-dark) text-(--cl-white)"
                  : "bg-white text-(--cl-base-dark) hover:bg-(--cl-base) hover:text-white"
              }`}
            >
              Calendar year
            </button>
            <button
              onClick={() => setYearType("financial")}
              className={`px-3 py-1.5 transition-colors ${
                yearType === "financial"
                  ? "bg-(--cl-base-dark) text-(--cl-white)"
                  : "bg-white text-(--cl-base-dark) hover:bg-(--cl-base) hover:text-white"
              }`}
            >
              Financial year
            </button>
          </div>

          {/* Year navigation */}
          <div className="flex items-center gap-1 text-sm font-semibold">
            <button
              onClick={() => shiftYear(-1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-(--cl-base) hover:text-white transition-colors"
              aria-label="Previous year"
            >
              ‹
            </button>
            <span className="min-w-24 text-center">{bounds.label}</span>
            <button
              onClick={() => shiftYear(1)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-(--cl-base) hover:text-white transition-colors"
              aria-label="Next year"
            >
              ›
            </button>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded border border-(--cl-base) hover:bg-(--cl-base) hover:text-white transition-colors"
          >
            <span>⚙</span>
            <span>Deductions</span>
          </button>
        </div>
      </div>

      {/* ── Deduction settings panel ─────────────────────────────────────── */}
      {showSettings && (
        <div className="mb-5 p-4 rounded-xl bg-(--cl-white) shadow-md border border-(--cl-base)/30">
          <h2 className="text-lg font-semibold mb-3">
            Default deduction settings
          </h2>
          <p className="text-sm text-(--cl-base) mb-4">
            These defaults apply to all deals. You can override the commission %
            per deal in the table.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(
              [
                {
                  label: "Commission % excl. VAT",
                  key: "commissionPct",
                  step: "0.01",
                },
                { label: "Royalty %", key: "royaltyPct", step: "0.5" },
                {
                  label: "Your office split %",
                  key: "officeSplitPct",
                  step: "1",
                  hint: "Your share — e.g. 50 for 50|50",
                },
                { label: "PAYE %", key: "payePct", step: "0.5" },
              ] as {
                label: string;
                key: keyof DeductionSettings;
                step: string;
                hint?: string;
              }[]
            ).map(({ label, key, step, hint }) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="font-semibold">{label}</span>
                {hint && (
                  <span className="text-xs text-(--cl-base)">{hint}</span>
                )}
                <input
                  type="number"
                  step={step}
                  min={0}
                  value={settings[key]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      [key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="mt-1 p-2 rounded border border-gray-300 w-full"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {filteredDeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-2xl font-semibold text-(--cl-base-dark)">
            No deals at Sale stage for {bounds.label}
          </p>
          <p className="text-(--cl-base) text-sm max-w-sm">
            Deals appear here once their workflow reaches the Sale stage and
            their expected close date falls within the selected year.
          </p>
        </div>
      )}

      {/* ── Deal cards — mobile & tablet (below lg) ─────────────────────── */}
      {filteredDeals.length > 0 && (
        <div className="lg:hidden flex flex-col gap-3">
          {filteredDeals.map((deal) => {
            const ov = getOverride(deal.id);
            const s = effectiveSettings(deal);
            const breakdown = deal.purchasePrice
              ? calculateNett(deal.purchasePrice, s)
              : null;
            const payeStr = breakdown
              ? (breakdown.PAYE ?? breakdown.paye ?? "—")
              : "—";
            const nettStr = breakdown ? breakdown.nettPaymentToAgent : "—";
            const isOpen = !!expandedCards[deal.id];

            return (
              <div
                key={deal.id}
                className="rounded-xl shadow-md bg-white overflow-hidden"
              >
                {/* Card header — always visible */}
                <div className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {deal.propertyAddress}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-(--cl-base)/20 text-(--cl-base-dark)">
                      {STAGE_LABELS[deal.currentStage] ??
                        `Stage ${deal.currentStage}`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-(--cl-base)">Nett Comm</p>
                    <p className="font-bold text-(--cl-accent) whitespace-nowrap">
                      {nettStr}
                    </p>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-(--cl-base)">Sales Price </span>
                    <span className="font-medium">
                      {formatZAR(deal.purchasePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-(--cl-base)">My Split </span>
                    <span className="font-medium">
                      {deal.combinedAgentSplitPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggleCard(deal.id)}
                  className="w-full px-3 py-2 text-sm font-medium border-t border-(--cl-base)/20 text-(--cl-base-dark) hover:bg-(--cl-base)/10 transition-colors flex items-center justify-center gap-1"
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Hide details" : "Show details"}
                  <span
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div className="p-3 border-t border-(--cl-base)/20 bg-(--cl-white)/40 flex flex-col gap-3 text-sm">
                    {/* Split breakdown */}
                    {(deal.internalSplitPct !== 100 ||
                      deal.externalSplitPct !== 100) && (
                      <p className="text-xs text-(--cl-base)">
                        {deal.internalSplitPct}% internal split ×{" "}
                        {deal.externalSplitPct}% external split
                      </p>
                    )}

                    {/* % Com + PAYE */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs text-(--cl-base)">% Com</span>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={
                              ov.commissionPct !== ""
                                ? ov.commissionPct
                                : (deal.expectedCommissionPct ??
                                  settings.commissionPct)
                            }
                            onChange={(e) =>
                              setOverrideField(
                                deal.id,
                                "commissionPct",
                                e.target.value,
                              )
                            }
                            className={inputCls}
                            aria-label="Commission %"
                          />
                          <span>%</span>
                        </div>
                      </label>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-(--cl-base)">
                          PAYE @{settings.payePct}%
                        </span>
                        <span className="font-medium text-(--cl-accent-dark)">
                          {payeStr}
                        </span>
                      </div>
                    </div>

                    {/* Agent / company */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <span className="text-xs text-(--cl-base) block">
                          Listing Agent
                        </span>
                        {deal.agentFullName ?? "—"}
                      </div>
                      <div>
                        <span className="text-xs text-(--cl-base) block">
                          Company
                        </span>
                        <span className="text-(--cl-base)">
                          {deal.listingCompany}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <span className="text-xs text-(--cl-base) block">
                          Listing Date
                        </span>
                        {formatDate(deal.listingDate)}
                      </div>
                      <div>
                        <span className="text-xs text-(--cl-base) block">
                          Sale Date
                        </span>
                        {formatDate(deal.expectedCloseDate)}
                      </div>
                      <div>
                        <span className="text-xs text-(--cl-base) block">
                          DOM
                        </span>
                        {domDays(deal.listingDate, deal.expectedCloseDate)}
                      </div>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs text-(--cl-base)">
                          Lodge Date
                        </span>
                        <input
                          type="date"
                          value={ov.lodgeDate}
                          onChange={(e) =>
                            setOverrideField(
                              deal.id,
                              "lodgeDate",
                              e.target.value,
                            )
                          }
                          className={inputCls}
                          aria-label="Lodge date"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs text-(--cl-base)">
                          Reg Date
                        </span>
                        <input
                          type="date"
                          value={ov.regDate}
                          onChange={(e) =>
                            setOverrideField(deal.id, "regDate", e.target.value)
                          }
                          className={inputCls}
                          aria-label="Reg date"
                        />
                      </label>
                    </div>

                    {/* Clients */}
                    <div>
                      <span className="text-xs text-(--cl-base) block mb-0.5">
                        Clients
                      </span>
                      {deal.clients.length > 0 ? (
                        <ul className="space-y-0.5">
                          {deal.clients.map((c, ci) => (
                            <li key={ci}>
                              <span className="text-xs text-(--cl-base) capitalize mr-1">
                                [{c.role}]
                              </span>
                              {c.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-(--cl-base)">—</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Mobile totals summary */}
          <div className="rounded-xl bg-(--cl-base-dark) text-(--cl-white) p-3 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide">
              Total nett ({filteredDeals.length} deal
              {filteredDeals.length === 1 ? "" : "s"})
            </span>
            <span className="font-bold text-lg">{formatZAR(totalNett)}</span>
          </div>
        </div>
      )}

      {/* ── Main table — desktop/large screens (lg and up) ──────────────── */}
      {filteredDeals.length > 0 && (
        <div className="hidden lg:block overflow-x-auto rounded-xl shadow-md relative overflow-scroll w-[95vw]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-(--cl-base-dark) text-(--cl-white)">
                {/* PROPERTY — sticky so it stays in view while scrolling */}
                <th className="sticky left-0 z-20 bg-(--cl-base-dark) px-3 py-2 text-left font-semibold">
                  Address
                </th>
                {/* STATUS */}
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Stage
                </th>
                {/* FINANCIALS — most-used figures come first */}
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Sales Price
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  % Com
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  My Split
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  PAYE @{settings.payePct}%
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap bg-(--cl-accent) text-white">
                  Nett Comm
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Listing Agent
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Company
                </th>
                {/* DATES */}
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Listing Date
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Sale Date
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  DOM
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Lodge Date
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Reg Date
                </th>
                {/* CLIENTS */}
                <th className="px-3 py-2 text-left font-semibold">Clients</th>
              </tr>
            </thead>

            <tbody>
              {filteredDeals.map((deal, i) => {
                const ov = getOverride(deal.id);
                const s = effectiveSettings(deal);
                const breakdown = deal.purchasePrice
                  ? calculateNett(deal.purchasePrice, s)
                  : null;
                // AgentCommission returns ZAR-formatted strings
                const payeStr = breakdown
                  ? (breakdown.PAYE ?? breakdown.paye ?? "—")
                  : "—";
                const nettStr = breakdown ? breakdown.nettPaymentToAgent : "—";
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-(--cl-white)/60";

                return (
                  <tr
                    key={deal.id}
                    className={`${rowBg} hover:bg-(--cl-base)/10 transition-colors`}
                  >
                    {/* Address — sticky */}
                    <td
                      className={`sticky left-0 z-10 ${rowBg} px-3 py-2 font-medium`}
                    >
                      {deal.propertyAddress}
                    </td>

                    {/* Stage */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-(--cl-base)/20 text-(--cl-base-dark)">
                        {STAGE_LABELS[deal.currentStage] ??
                          `Stage ${deal.currentStage}`}
                      </span>
                    </td>

                    {/* Sales price */}
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium">
                      {formatZAR(deal.purchasePrice)}
                    </td>

                    {/* % Com — editable per-row */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={
                            ov.commissionPct !== ""
                              ? ov.commissionPct
                              : (deal.expectedCommissionPct ??
                                settings.commissionPct)
                          }
                          onChange={(e) =>
                            setOverrideField(
                              deal.id,
                              "commissionPct",
                              e.target.value,
                            )
                          }
                          className={`${inputCls} text-right w-14`}
                          aria-label="Commission %"
                        />
                        <span>%</span>
                      </div>
                    </td>

                    {/* My split — combined internal (co-agent) × external (agency) split */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div>{deal.combinedAgentSplitPct.toFixed(1)}%</div>
                      {(deal.internalSplitPct !== 100 ||
                        deal.externalSplitPct !== 100) && (
                        <div className="text-xs text-(--cl-base)">
                          {deal.internalSplitPct}% int. ×{" "}
                          {deal.externalSplitPct}% ext.
                        </div>
                      )}
                    </td>

                    {/* PAYE amount */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-(--cl-accent-dark)">
                      {payeStr}
                    </td>

                    {/* Nett commission — highlighted */}
                    <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-(--cl-accent)">
                      {nettStr}
                    </td>

                    {/* Listing agent */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {deal.agentFullName ?? "—"}
                    </td>

                    {/* Company */}
                    <td className="px-3 py-2 whitespace-nowrap text-(--cl-base)">
                      {deal.listingCompany}
                    </td>

                    {/* Listing date */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(deal.listingDate)}
                    </td>

                    {/* Sale date (expectedCloseDate) */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(deal.expectedCloseDate)}
                    </td>

                    {/* DOM */}
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {domDays(deal.listingDate, deal.expectedCloseDate)}
                    </td>

                    {/* Lodge date — editable */}
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={ov.lodgeDate}
                        onChange={(e) =>
                          setOverrideField(deal.id, "lodgeDate", e.target.value)
                        }
                        className={inputCls}
                        aria-label="Lodge date"
                      />
                    </td>

                    {/* Reg date — editable */}
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={ov.regDate}
                        onChange={(e) =>
                          setOverrideField(deal.id, "regDate", e.target.value)
                        }
                        className={inputCls}
                        aria-label="Reg date"
                      />
                    </td>

                    {/* Clients */}
                    <td className="px-3 py-2">
                      {deal.clients.length > 0 ? (
                        <ul className="space-y-0.5">
                          {deal.clients.map((c, ci) => (
                            <li key={ci} className="whitespace-nowrap">
                              <span className="text-xs text-(--cl-base) capitalize mr-1">
                                [{c.role}]
                              </span>
                              {c.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-(--cl-base)">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr className="bg-(--cl-base-dark) text-(--cl-white) font-semibold">
                <td className="sticky left-0 z-10 bg-(--cl-base-dark) px-3 py-2 text-right text-xs uppercase tracking-wide">
                  Total
                </td>
                <td />
                <td className="px-3 py-2 text-right">
                  {formatZAR(
                    filteredDeals.reduce(
                      (s, d) => s + (d.purchasePrice ?? 0),
                      0,
                    ),
                  )}
                </td>
                <td colSpan={2} />
                <td className="px-3 py-2 text-right">
                  {formatZAR(
                    filteredDeals.reduce((s, d) => {
                      if (!d.purchasePrice) return s;
                      const r = calculateNett(
                        d.purchasePrice,
                        effectiveSettings(d),
                      );
                      return s + parseZAR(r.PAYE ?? r.paye ?? "0");
                    }, 0),
                  )}
                </td>
                <td className="px-3 py-2 text-right bg-(--cl-accent)">
                  {formatZAR(totalNett)}
                </td>
                <td colSpan={9} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Cashflow forecast ─────────────────────────────────────────────── */}
      {filteredDeals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3 text-(--cl-base-dark)">
            Cashflow forecast — {bounds.label}
          </h2>
          {/* Mobile/tablet — scrollable grid of month cards, no table needed */}
          <div className="md:hidden grid grid-cols-3 sm:grid-cols-4 gap-2">
            {cashflowByMonth.map((v, i) => (
              <div
                key={i}
                className={`rounded-lg p-2.5 text-center ${
                  v > 0 ? "bg-white shadow-sm" : "bg-(--cl-white)/50"
                }`}
              >
                <p className="text-xs text-(--cl-base)">{cashflowHeaders[i]}</p>
                <p
                  className={`text-sm font-semibold whitespace-nowrap ${
                    v > 0 ? "text-(--cl-accent)" : "text-(--cl-base)"
                  }`}
                >
                  {v > 0 ? formatZAR(v) : "R 0"}
                </p>
              </div>
            ))}
            <div className="col-span-3 sm:col-span-4 rounded-lg p-2.5 text-center bg-(--cl-base-dark) text-(--cl-white)">
              <p className="text-xs uppercase tracking-wide">Total</p>
              <p className="font-bold">{formatZAR(totalNett)}</p>
            </div>
          </div>

          {/* Desktop — full table */}
          <div className="hidden md:block overflow-x-auto rounded-xl shadow-md overflow-scroll w-[95vw]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-(--cl-base) text-white">
                  {cashflowHeaders.map((m) => (
                    <th
                      key={m}
                      className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold bg-(--cl-base-dark)">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  {cashflowByMonth.map((v, i) => (
                    <td
                      key={i}
                      className={`px-3 py-3 text-right font-medium whitespace-nowrap ${
                        v > 0
                          ? "text-(--cl-accent) font-bold"
                          : "text-(--cl-base)"
                      }`}
                    >
                      {v > 0 ? formatZAR(v) : "R 0.00"}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-bold text-(--cl-base-dark) bg-(--cl-white)">
                    {formatZAR(totalNett)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footnote ────────────────────────────────────────────────────── */}
      {filteredDeals.length > 0 && (
        <p className="mt-4 text-xs text-(--cl-base)">
          Cashflow forecast uses expected close date. Lodge and Reg dates are
          local to this session and not saved to the database. Commission % can
          be overridden per deal; all other deductions use the settings panel
          defaults.
        </p>
      )}
    </div>
  );
}
