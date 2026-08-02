"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFileText,
  IconMenu,
  IconPlus,
  IconSettings,
  IconShield,
  IconTruck,
  IconX,
  type IconProps,
} from "@/components/ui/icons";
import { AccountMenu } from "./account-menu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/quotes", label: "Quotes", icon: IconFileText },
  { href: "/loads", label: "Loads", icon: IconTruck },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

type ShellUser = {
  name: string;
  email: string;
  orgName: string | null;
  admin: boolean;
};

function Wordmark() {
  return (
    <a href="/dashboard" className="flex items-center gap-2.5" aria-label="Peer Freight dashboard">
      <img src="/site/peer-logo-mark.png" alt="" width={30} height={30} draggable={false} />
      <span className="text-base font-extrabold tracking-tight">
        <span className="text-white">Peer</span> <span className="text-gold">Freight</span>
      </span>
    </a>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  gold = false,
}: {
  href: string;
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  active: boolean;
  gold?: boolean;
}) {
  const tone = gold
    ? active
      ? "bg-navy-card text-gold"
      : "text-gold/70 hover:bg-white/5 hover:text-gold"
    : active
      ? "bg-navy-card text-white"
      : "text-white/65 hover:bg-white/5 hover:text-white";
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${tone}`}
    >
      <Icon size={18} className="shrink-0" />
      {label}
    </a>
  );
}

/** Full rail: wordmark, global CTA, nav, admin group, account row. Rendered
 * in the fixed desktop rail and again inside the mobile drawer. */
function Rail({ user, pathname }: { user: ShellUser; pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5">
        <Wordmark />
      </div>
      {/* The quote CTA is the shipper's global action; on internal /admin
          pages it is noise, so the rail drops it there. */}
      {pathname.startsWith("/admin") ? null : (
        <div className="px-4 pt-6">
          <a
            href="/quotes/new"
            className="btn-gold-grad flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-navy transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <IconPlus size={16} />
            Request a quote
          </a>
        </div>
      )}
      <nav className="mt-6 flex-1 overflow-y-auto px-4" aria-label="Portal">
        <div className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>
        {user.admin ? (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/40">
              Internal
            </p>
            <NavLink
              href="/admin"
              label="Admin"
              icon={IconShield}
              active={pathname.startsWith("/admin")}
              gold
            />
          </div>
        ) : null}
      </nav>
      <div className="border-t border-white/10 p-3">
        <AccountMenu
          name={user.name}
          email={user.email}
          orgName={user.orgName}
          admin={user.admin}
          direction="up"
          variant="row"
        />
      </div>
    </div>
  );
}

/**
 * App shell chrome: fixed 256px navy rail on desktop; sticky navy top bar
 * with a slide-in drawer under lg. The layout wraps pages in `lg:pl-64`.
 */
export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Route change closes the drawer.
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy text-white lg:block">
        <Rail user={user} pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-navy px-4 text-white lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen(true)}
          className="-ml-1 rounded-lg p-1.5 text-white/80 hover:bg-white/5 hover:text-white"
        >
          <IconMenu size={20} />
        </button>
        <Wordmark />
        <div className="ml-auto">
          <AccountMenu
            name={user.name}
            email={user.email}
            orgName={user.orgName}
            admin={user.admin}
            direction="down"
            variant="avatar"
          />
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-navy/50"
          />
          <div className="relative flex h-full w-64 flex-col bg-navy text-white">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <IconX size={18} />
            </button>
            <Rail user={user} pathname={pathname} />
          </div>
        </div>
      ) : null}
    </>
  );
}
