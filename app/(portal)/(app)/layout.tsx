import { Sidebar } from "@/components/portal/sidebar";
import { getShellSession } from "@/lib/portal/session";

/**
 * Signed-in app shell: navy sidebar rail, paper canvas, 1120px content
 * column. Auth here is shell-grade only (signed in, tolerate zero orgs so
 * org-less admins can reach /admin); every page keeps its strict guard.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellSession();
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar user={user} />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
