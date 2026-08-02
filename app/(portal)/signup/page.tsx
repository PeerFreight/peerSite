import type { Metadata } from "next";
import { enabledSocialProviders } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account - Peer Freight",
  robots: { index: false },
};

export default function SignupPage() {
  return <SignupForm providers={enabledSocialProviders()} />;
}
