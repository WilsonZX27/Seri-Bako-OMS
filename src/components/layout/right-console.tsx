"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type RightConsoleContextValue = {
  setContent: (content: ReactNode) => void;
  clearContent: () => void;
};

const RightConsoleContext = createContext<RightConsoleContextValue | null>(null);

export function RightConsoleProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode>(null);
  const value = useMemo(
    () => ({
      setContent: setContentState,
      clearContent: () => setContentState(null),
    }),
    [],
  );

  return (
    <RightConsoleContext.Provider value={value}>
      {children}
      <aside data-right-console className="hidden h-full min-h-0 w-[300px] shrink-0 overflow-hidden border-l bg-[#f3f2ed] xl:block">
        <div className="h-full overflow-y-auto overflow-x-hidden px-3 py-2">{content}</div>
      </aside>
    </RightConsoleContext.Provider>
  );
}

export function RightConsoleMount({ children }: { children: ReactNode }) {
  const context = useContext(RightConsoleContext);

  useEffect(() => {
    context?.setContent(children);
    return () => context?.clearContent();
  }, [children, context]);

  return null;
}

export function ConsoleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200/80 px-1 py-3 last:border-b-0">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}
