import { useEffect, useState } from "react";
import { getTeamOverview, type AgentOverview } from "../../lib/teamOverview";

function formatZAR(value: number): string {
  return value.toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-(--cl-base)">{label}</p>
      <p
        className={`font-semibold ${alert ? "text-(--cl-accent)" : "text-(--cl-base-dark)"}`}
      >
        {value}
      </p>
    </div>
  );
}

// Admin-only team overview (route is wrapped in AdminRequired).
export default function Stats() {
  const [state, setState] = useState<
    { agents: AgentOverview[] } | { error: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    getTeamOverview()
      .then((agents) => {
        if (!cancelled) setState({ agents });
      })
      .catch((err) => {
        console.error("Failed to load team overview:", err);
        if (!cancelled) setState({ error: "Couldn't load the team overview." });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!state)
    return (
      <div className="flex items-center justify-center gap-3">
        <p>Loading team overview</p>
        <img src="/blocks-shuffle-3.svg" alt="Loading..." className="w-6 h-6" />
      </div>
    );

  if ("error" in state)
    return (
      <div className="p-4 rounded bg-red-50 text-(--cl-accent-dark)">
        {state.error}
      </div>
    );

  const { agents } = state;
  const totals = agents.reduce(
    (t, a) => ({
      active: t.active + a.active,
      overdue: t.overdue + a.overdueTasks,
    }),
    { active: 0, overdue: 0 },
  );

  return (
    <div className="w-full max-w-4xl text-(--cl-base-dark)">
      <h1 className="text-3xl font-bold">Team overview</h1>
      <p className="text-sm text-(--cl-base) mb-4">
        {agents.length} agent{agents.length === 1 ? "" : "s"} · {totals.active}{" "}
        active deal{totals.active === 1 ? "" : "s"} · {totals.overdue} overdue
        task{totals.overdue === 1 ? "" : "s"}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 text-left">
        {agents.map((a) => (
          <li key={a.agentId} className="bg-(--cl-white) rounded shadow-md p-4">
            <h2 className="mb-3">{a.fullName}</h2>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Active" value={a.active} />
              <Stat label="Closed" value={a.closed} />
              <Stat label="Fell through" value={a.fellThrough} />
              <Stat
                label="Overdue tasks"
                value={a.overdueTasks}
                alert={a.overdueTasks > 0}
              />
              <div className="col-span-2">
                <Stat
                  label="Active sales value (agent's share)"
                  value={formatZAR(a.activeSalesValue)}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-(--cl-base)">
        Shared deals count once for each agent on them. Sales value is the
        agreed purchase price of active deals, weighted by each agent&apos;s
        internal split; it is not a commission figure.
      </p>
    </div>
  );
}
