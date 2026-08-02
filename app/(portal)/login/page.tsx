import type { Metadata } from "next";
import { enabledSocialProviders } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in - Peer Freight",
  robots: { index: false },
};

export default function LoginPage() {
  // Server component reads the env flags; the client form only gets booleans.
  return <LoginForm providers={enabledSocialProviders()} />;
}
