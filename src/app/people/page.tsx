import type { Metadata } from "next";
import PeopleDirectory from "@/components/PeopleDirectory";

export const metadata: Metadata = {
  title: "Discover Members | SmartTag Worldwide",
  description: "Discover SmartTag members and connect with your community.",
};

export default function PeoplePage() {
  return <PeopleDirectory />;
}
