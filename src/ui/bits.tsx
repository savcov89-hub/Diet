import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" className="chip" data-on={on} onClick={onClick} title={title} aria-pressed={on}>
      {on && <Check />}
      {children}
    </button>
  );
}

export function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; hint?: string }> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`rounded-xl border px-3 py-2.5 text-left transition ${value === o.value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2"}`}>
          <span className="block text-sm font-semibold">{o.label}</span>
          {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function Bar({ pct, status }: { pct: number; status: "ok" | "low" | "high" | "na" }) {
  const color = status === "ok" ? "var(--ok)" : status === "low" ? "var(--warn)" : status === "high" ? "var(--danger)" : "var(--muted)";
  const w = Math.max(2, Math.min(100, pct));
  return (
    <div className="bar" role="img" aria-label={`${Math.round(pct)} % от нормы`}>
      <i style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "danger" | "info" | "muted"; children: ReactNode }) {
  const map = {
    ok: "bg-accent-soft text-accent-strong", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", info: "bg-info-soft text-info", muted: "bg-surface-2 text-muted",
  } as const;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold mono">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
