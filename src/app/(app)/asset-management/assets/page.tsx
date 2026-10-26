import { redirect } from "next/navigation";

export default function AssetRegisterIndex() {
  redirect("/asset-management?view=assets");
}
