import type { Metadata } from "next";
import SavedPosts from "@/components/SavedPosts";

export const metadata: Metadata = {
  title: "Saved Posts | SmartTag Worldwide",
  description: "Your personal collection of saved SmartTag posts.",
};

export default function SavedPage() {
  return <SavedPosts />;
}
