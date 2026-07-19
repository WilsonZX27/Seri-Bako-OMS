import { redirect } from "next/navigation";

export default function LegacyNewLocationPage() {
  redirect("/branches");
}
