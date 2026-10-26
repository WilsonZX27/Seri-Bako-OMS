export type ExternalScheduleDay={staff_id:string;work_date:string;branch_id:string;branch_name:string;planned_start:string|null;planned_end:string|null;assignment_kind?:string;schedule_status?:string;conflict?:boolean};
export function externalScheduleDays(rows:ExternalScheduleDay[]) {
 const days=new Map<string,ExternalScheduleDay>();
 for(const row of rows){const key=`${row.staff_id}:${row.work_date}`,prior=days.get(key);days.set(key,prior?{...prior,branch_name:[prior.branch_name,row.branch_name].join(" / "),assignment_kind:"conflict",planned_start:null,planned_end:null,conflict:true}:row);}return days;
}
export function externalScheduleLabel(row?:ExternalScheduleDay){
 if(!row)return "";
 if(row.conflict)return `Conflicting rosters · ${row.branch_name}`;
 const kind=row.assignment_kind??"shift";
 const detail=kind==="shift"?`${row.planned_start?.slice(0,5)??"Time unavailable"}–${row.planned_end?.slice(0,5)??"Time unavailable"}`:kind.toUpperCase();
 return `${row.branch_name} · ${detail}${row.schedule_status&&!["published","locked"].includes(row.schedule_status)?" · Unpublished":""}`;
}
