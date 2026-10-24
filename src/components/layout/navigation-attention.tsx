"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const NavigationAttention = createContext<string[]>([]);

// Navigation permissions are already resolved; only its optional dots wait.
export function NavigationAttentionProvider({ hrefs, children }: { hrefs: Promise<string[]>; children: ReactNode }) {
  const [attentionHrefs, setAttentionHrefs] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    setAttentionHrefs([]);
    void hrefs.then((next) => { if (current) setAttentionHrefs(next); }, () => { if (current) setAttentionHrefs([]); });
    return () => { current = false; };
  }, [hrefs]);
  return <NavigationAttention.Provider value={attentionHrefs}>{children}</NavigationAttention.Provider>;
}

export function useNavigationAttention() {
  return useContext(NavigationAttention);
}
