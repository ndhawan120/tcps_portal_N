const statusStyles: Record<string, string> = {
  not_started: "bg-surface-container text-on-surface-variant",
  draft: "bg-surface-container text-on-surface-variant",
  pending_approval: "bg-primary-container text-on-primary-container",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-error-container text-on-error-container",
  scheduled: "bg-primary-container text-on-primary-container",
  in_progress: "bg-primary-container text-on-primary-container",
  passed: "bg-emerald-100 text-emerald-800",
  failed: "bg-error-container text-on-error-container",
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
        statusStyles[status] ?? "bg-surface-container text-on-surface-variant"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
