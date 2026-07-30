import type { ReactNode } from "react";

/**
 * Portal app shell: navy header with the two-tone wordmark, white canvas,
 * 1240px max content width. `nav` and `user` are slots for the signed-in
 * navigation and account menu once auth lands (Phase 1).
 */
export function AppShell({
  nav,
  user,
  children,
}: {
  nav?: ReactNode;
  user?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="bg-navy text-white">
        <div className="mx-auto flex h-[72px] w-full max-w-wrap items-center gap-8 px-6">
          <a href="/" className="flex items-center gap-2.5" aria-label="Peer Freight home">
            <img src="/site/peer-logo-mark.png" alt="" width={34} height={34} draggable={false} />
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-white">Peer</span>{" "}
              <span className="text-gold">Freight</span>
            </span>
          </a>
          {nav ? (
            <nav className="flex items-center gap-6 text-sm font-bold text-white/80" aria-label="Portal">
              {nav}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-4">{user}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-wrap flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
