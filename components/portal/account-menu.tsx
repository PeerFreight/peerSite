"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { IconChevronDown, IconLogOut, IconSettings } from "@/components/ui/icons";
import { authClient } from "@/lib/auth-client";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Account menu for the app shell. Desktop: opens upward from the
 * sidebar-bottom account row. Mobile: opens downward from the top-bar
 * avatar. Bordered with a soft shadow — overlays get depth; inline panels stay flat.
 * Sign out lives here and in Settings — the standard both-places pattern.
 */
export function AccountMenu({
  name,
  email,
  orgName,
  admin,
  direction,
  variant,
}: {
  name: string;
  email: string;
  orgName: string | null;
  admin: boolean;
  direction: "up" | "down";
  variant: "row" | "avatar";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
        );
        if (items.length === 0) return;
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(i + 1) % items.length]
            : items[(i - 1 + items.length) % items.length];
        next.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [open]);

  const avatar = (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold text-white"
    >
      {initials(name)}
    </span>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === "avatar" ? "Account menu" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "row"
            ? "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            : "flex items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        }
      >
        {avatar}
        {variant === "row" ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">{name}</span>
              {orgName ? (
                <span className="block truncate text-xs text-white/55">{orgName}</span>
              ) : null}
            </span>
            <IconChevronDown
              size={14}
              className={`shrink-0 text-white/40 transition-transform ${open ? "" : "rotate-180"}`}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className={`absolute z-50 w-60 rounded-lg border border-line bg-white p-1.5 shadow-lg text-ink ${
            direction === "up" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
          }`}
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <span className="truncate">{name}</span>
              {admin ? <Badge tone="navy">Admin</Badge> : null}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
            {orgName ? <p className="truncate text-xs text-muted">{orgName}</p> : null}
          </div>
          <div className="border-t border-line pt-1.5">
            <a
              href="/settings"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-bold text-ink hover:bg-paper focus-visible:bg-paper focus-visible:outline-none"
            >
              <IconSettings size={16} className="text-muted" />
              Settings
            </a>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-bold text-ink hover:bg-paper focus-visible:bg-paper focus-visible:outline-none"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
              }}
            >
              <IconLogOut size={16} className="text-muted" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
