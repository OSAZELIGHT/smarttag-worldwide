import type { Metadata } from "next";
import CommunitiesHub from "@/components/CommunitiesHub";

export const metadata: Metadata = {
  title: "Communities | SmartTag Worldwide",
  description: "Discover and create SmartTag communities.",
};

export default function CommunitiesPage() {
  return <CommunitiesHub />;
}
