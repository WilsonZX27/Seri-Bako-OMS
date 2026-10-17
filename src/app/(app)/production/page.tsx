import { redirect } from "next/navigation";

/** Keep existing bookmarks while consolidating the redundant production hub. */
export default function ProductionPage() {
  redirect("/production/jobs");
}
