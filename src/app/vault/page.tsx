import type { Metadata } from "next";
import SmartVault from "@/components/SmartVault";

export const metadata: Metadata = {
  title: "Smart Vault | SmartTag Worldwide",
  description: "Your private SmartTag photo and video library.",
};

export default function VaultPage() {
  return <SmartVault />;
}
