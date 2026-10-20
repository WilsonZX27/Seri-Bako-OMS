import { redirect } from "next/navigation";
export default async function ReportProblem({searchParams}:{searchParams:Promise<{location?:string;asset?:string}>}) {
  const query=await searchParams;
  const params=new URLSearchParams({view:"maintenance",report:"1"});
  if(query.location)params.set("location",query.location);
  if(query.asset)params.set("asset",query.asset);
  redirect(`/asset-management?${params}`);
}
