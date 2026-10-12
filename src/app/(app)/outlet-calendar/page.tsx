import { redirect } from "next/navigation";
export default async function OutletCalendarPage({searchParams}:{searchParams:Promise<{month?:string;branch?:string}>}) {
 const {month,branch}=await searchParams;
 const query=new URLSearchParams({view:"calendar"});
 if(month)query.set("month",month);
 if(branch)query.set("branch",branch);
 redirect(`/outlet-compliance?${query}`);
}
