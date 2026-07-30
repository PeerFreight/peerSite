const ITEMS = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "quotes", href: "/quotes", label: "Quotes" },
  { key: "loads", href: "/loads", label: "Loads" },
  { key: "settings", href: "/settings", label: "Settings" },
] as const;

export type PortalNavKey = (typeof ITEMS)[number]["key"] | "admin";

/** Signed-in header nav. `admin` adds the founder-only queue link. */
export function PortalNav({ active, admin = false }: { active?: PortalNavKey; admin?: boolean }) {
  return (
    <>
      {ITEMS.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className={active === item.key ? "text-white" : "hover:text-white"}
        >
          {item.label}
        </a>
      ))}
      {admin ? (
        <a
          href="/admin"
          className={active === "admin" ? "text-gold" : "text-gold/70 hover:text-gold"}
        >
          Admin
        </a>
      ) : null}
    </>
  );
}
