import type { Metadata } from "next";
import NotificationsInbox from "@/components/NotificationsInbox";

export const metadata: Metadata = {
  title: "Notifications | SmartTag Worldwide",
  description: "Your SmartTag follows, reactions, comments and messages.",
};

export default function NotificationsPage() {
  return <NotificationsInbox />;
}
