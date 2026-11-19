import type { Metadata } from "next";
import ReelsFeed from "@/components/ReelsFeed";

export const metadata: Metadata = {
  title: "Reels | SmartTag Worldwide",
  description: "Watch short videos shared by your SmartTag community.",
};

export default function ReelsPage() {
  return <ReelsFeed />;
}
