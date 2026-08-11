export type StatusBarItem = {
  label: string;
  count: number;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

const tones: Record<NonNullable<StatusBarItem["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-slate-400",
};

export default function StatusBars({ title, items }: { title: string; items: StatusBarItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-on-surface">{title}</h2>
        <span className="text-xs text-on-surface-variant">{total} total</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-on-surface-variant">{item.label}</span>
              <span className="font-semibold text-on-surface">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container overflow-hidden">
              <div
                className={`h-full rounded-full ${tones[item.tone ?? "primary"]}`}
                style={{ width: `${Math.round((item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
