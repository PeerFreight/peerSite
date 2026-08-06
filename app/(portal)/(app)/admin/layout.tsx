import { requireAdminSession } from "@/lib/portal/session";

/**
 * Belt and suspenders for /admin: every page under here calls
 * requireAdminSession itself and every admin query re-proves the role
 * (assertAdmin), but a future page that forgets both is still bounced to
 * /dashboard here instead of rendering.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return children;
}
