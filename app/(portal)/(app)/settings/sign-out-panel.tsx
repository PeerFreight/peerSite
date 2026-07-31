"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconLogOut } from "@/components/ui/icons";
import { authClient } from "@/lib/auth-client";

export function SignOutPanel() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
      }}
    >
      <IconLogOut size={15} />
      Sign out
    </Button>
  );
}
