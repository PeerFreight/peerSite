"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Signed in as the wrong person for this invitation: sign out and reload
 * the invite page so the signed-out path (sign in / create account) shows. */
export function SwitchAccountButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      Sign out and switch account
    </Button>
  );
}
