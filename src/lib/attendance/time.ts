const timePattern=/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function formatAttendanceTime(value?:string|null,{seconds=false}:{seconds?:boolean}={}){
  if(!value)return "—";
  const clock=value.includes("T")?new Date(value):null;
  if(clock&&!Number.isNaN(clock.getTime()))return new Intl.DateTimeFormat("en-MY",{timeZone:"Asia/Kuala_Lumpur",hour:"numeric",minute:"2-digit",second:seconds?"2-digit":undefined,hour12:true}).format(clock);
  const match=timePattern.exec(value.trim());
  if(!match)return value;
  const hour=Number(match[1]),minute=match[2],second=match[3];
  if(hour>23)return value;
  return `${hour%12||12}:${minute}${seconds&&second?`:${second}`:""} ${hour<12?"AM":"PM"}`;
}

export function attendanceTimeOptions(){
  return Array.from({length:48},(_,index)=>{
    const value=`${String(Math.floor(index/2)).padStart(2,"0")}:${index%2?"30":"00"}`;
    return {value,label:formatAttendanceTime(value)};
  });
}
