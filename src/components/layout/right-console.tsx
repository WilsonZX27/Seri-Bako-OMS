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
      <aside data-right-console className="hidden h-full min-h-0 w-[340px] shrink-0 overflow-hidden border-l bg-white xl:block">
        <div data-right-console-scroll className="h-full overflow-y-auto overflow-x-hidden bg-white px-2 py-1">
          {content ?? (
            <ConsoleSection title="Workspace Context">
              <p className="text-[11px] text-[var(--sb-text-muted)]">Open a record to see actions, timeline, and metadata here.</p>
            </ConsoleSection>
          )}
        </div>
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
    <section className="border-b border-[var(--border-muted)] px-3 py-2.5 last:border-b-0">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sb-text-muted)]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
