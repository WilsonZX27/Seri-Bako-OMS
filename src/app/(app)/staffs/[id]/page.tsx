import { redirect } from "next/navigation";
export default async function StaffSecurityRedirect({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{error?:string;success?:string}> }) {
 const {id}=await params;
 const query=await searchParams;
 const values=new URLSearchParams({section:"security",...(query.error?{error:query.error}:{}),...(query.success?{success:query.success}:{})});
 redirect(`/people/${encodeURIComponent(id)}?${values}`);
}
