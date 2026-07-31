/** Founder sub-nav between the quote queue and the loads board. */
export function AdminNav({ active }: { active: "queue" | "loads" }) {
  const link = (href: string, key: "queue" | "loads", label: string) => (
    <a
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        active === key ? "bg-navy text-white" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </a>
  );
  return (
    <div className="flex items-center gap-2">
      {link("/admin", "queue", "Quote queue")}
      {link("/admin/loads", "loads", "Loads")}
    </div>
  );
}
