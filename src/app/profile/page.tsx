import type { Metadata } from "next";
import ProfileSettings from "@/components/ProfileSettings";

export const metadata: Metadata = {
  title: "Profile Settings | SmartTag Worldwide",
  description: "Manage your SmartTag identity and privacy.",
};

export default function ProfilePage() {
  return <ProfileSettings />;
}
