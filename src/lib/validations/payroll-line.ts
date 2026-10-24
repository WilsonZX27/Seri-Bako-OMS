import { z } from "zod";
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {const date=new Date(`${value}T00:00:00Z`);return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;},"Invalid payroll source date");
export const payrollLineSchema = z.object({
  kind: z.enum(["earning", "deduction"]), label: z.string().trim().min(1).max(120), amount: z.number().finite().nonnegative().max(999999999),
  source_kind: z.enum(["manual", "attendance_short_hours", "emergency_leave"]).optional(),
  source_dates: z.array(day).max(366).optional(),
}).superRefine((line, ctx) => {
  if(line.kind === "deduction" && line.source_kind === "emergency_leave") ctx.addIssue({code:"custom",message:"Emergency Leave is paid leave and cannot be a deduction."});
  if(line.source_kind === "attendance_short_hours" && !line.source_dates?.length) ctx.addIssue({code:"custom",message:"Choose the attendance dates for this short-hours line."});
});
