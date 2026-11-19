import type { Metadata } from "next";
import MessagesInbox from "@/components/MessagesInbox";

export const metadata: Metadata = {
  title: "Messages | SmartTag Worldwide",
  description: "Private conversations with your SmartTag community.",
};

export default function MessagesPage() {
  return <MessagesInbox />;
}
