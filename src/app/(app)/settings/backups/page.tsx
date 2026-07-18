import { redirect } from "next/navigation";

export default function LegacyBackupRoute() {
  redirect("/administration/backups");
}
