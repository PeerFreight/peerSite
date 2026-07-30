"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-bold text-white/80 hover:text-white"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
      }}
      title="Sign out"
    >
      {label} · Sign out
    </button>
  );
}
