import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

export default function ScheduleLoading() {
  const rightRail = <>
    <ConsoleSection title="Schedule actions" kind="action"><div className="space-y-2"><div className="sb-skeleton h-9 w-full"/><div className="sb-skeleton h-9 w-full"/><div className="sb-skeleton h-9 w-full"/></div></ConsoleSection>
    <ConsoleSection title="This week" kind="status"><div className="space-y-2"><div className="sb-skeleton h-3 w-full"/><div className="sb-skeleton h-3 w-2/3"/></div></ConsoleSection>
    <ConsoleSection title="Attendance tools"><div className="space-y-2"><div className="sb-skeleton h-9 w-full"/><div className="sb-skeleton h-9 w-full"/><div className="sb-skeleton h-9 w-full"/></div></ConsoleSection>
  </>;
  return <div aria-live="polite" aria-busy="true"><span className="sr-only" role="status">Loading schedule…</span><div className="sb-workspace-canvas mb-3 space-y-2" data-workspace-canvas data-canvas-mode="full"><div className="sb-skeleton h-5 w-40"/><div className="sb-skeleton h-3 w-72 max-w-full"/></div><WorkspaceGrid tabletCanvas="full" rightRail={rightRail}><div className="sb-work-surface flex gap-2 p-1">{[0,1,2,3].map((item)=><div key={item} className="sb-skeleton h-9 w-24"/>)}</div><div className="sb-work-surface space-y-3 p-3"><div className="flex gap-2"><div className="sb-skeleton h-9 w-48"/><div className="sb-skeleton h-9 w-56"/><div className="sb-skeleton h-9 w-20"/></div><div className="flex gap-2">{[0,1,2,3,4,5].map((item)=><div key={item} className="sb-skeleton h-9 w-16"/>)}</div></div><section className="sb-work-surface overflow-hidden"><div className="grid grid-cols-[14rem_repeat(7,minmax(7rem,1fr))] border-b p-2">{Array.from({length:8},(_,item)=><div key={item} className="sb-skeleton mx-1 h-7"/>)}</div>{Array.from({length:5},(_,row)=><div key={row} className="grid grid-cols-[14rem_repeat(7,minmax(7rem,1fr))] border-b p-2">{Array.from({length:8},(_,cell)=><div key={cell} className="sb-skeleton mx-1 h-11"/>)}</div>)}</section></WorkspaceGrid></div>;
}
