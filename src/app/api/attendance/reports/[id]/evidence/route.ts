import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
 let storagePath:string|null=null;
 try{
  const {id}=await params;z.string().uuid().parse(id);const actor=await requireActiveTenantActor();
  if(!(await hasPermission("attendance.report.submit"))&&!(await hasPermission("attendance.report.approve")))return NextResponse.json({ok:false,message:"Attendance evidence permission required."},{status:403});
  const form=await request.formData();const value=form.get("file");if(!(value instanceof File)||!value.size)return NextResponse.json({ok:false,message:"Choose an MC document."},{status:400});
  if(value.size>4*1024*1024)return NextResponse.json({ok:false,message:"MC evidence must be 4 MB or smaller."},{status:400});
  const allowed=new Set(["application/pdf","image/png","image/jpeg","image/webp"]);if(!allowed.has(value.type))return NextResponse.json({ok:false,message:"Use a PDF, PNG, JPEG, or WebP document."},{status:400});
  const bytes=new Uint8Array(await value.slice(0,12).arrayBuffer());const starts=(...expected:number[])=>expected.every((byte,index)=>bytes[index]===byte);const valid=value.type==="application/pdf"?starts(37,80,68,70,45):value.type==="image/png"?starts(137,80,78,71,13,10,26,10):value.type==="image/jpeg"?starts(255,216,255):bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";if(!valid)return NextResponse.json({ok:false,message:"Document content does not match its file type."},{status:400});
  const db=await createClient();const {data:report,error:reportError}=await db.from("daily_attendance_reports" as never).select("id,report_type,status,submitted_by" as never).eq("id" as never,id).eq("company_id" as never,actor.companyId).maybeSingle() as unknown as {data:{id:string;report_type:string;status:string;submitted_by:string}|null;error:Error|null};if(reportError||!report||report.report_type!=="mc"||report.status!=="pending")return NextResponse.json({ok:false,message:"This pending MC report is not available."},{status:404});
  const attachmentId=crypto.randomUUID();const safeName=value.name.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-120)||"mc-evidence";storagePath=`${actor.companyId}/attendance/${id}/${crypto.randomUUID()}-${safeName}`;
  const upload=await db.storage.from("document-attachments").upload(storagePath,Buffer.from(await value.arrayBuffer()),{contentType:value.type,upsert:false});if(upload.error)throw upload.error;
  const evidence=await db.rpc("attach_daily_attendance_report_evidence" as never,{p_report_id:id,p_attachment_id:attachmentId,p_file_name:value.name.slice(0,180),p_file_type:value.type,p_file_size:value.size,p_storage_path:storagePath} as never);if(evidence.error)throw evidence.error;
  return NextResponse.json({ok:true});
 }catch(error){if(storagePath){try{const db=await createClient();await db.storage.from("document-attachments").remove([storagePath])}catch{}}logServerError(error,{source:"api.attendance.report-evidence"});return NextResponse.json({ok:false,message:"MC evidence could not be uploaded."},{status:500})}
}
