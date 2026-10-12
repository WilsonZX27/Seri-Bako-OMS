"use client";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { AssetDraftIssue, AssetDraftScope } from "@/components/asset-draft-state";
import { clearAssetRouteDrafts, isolateAssetDrafts } from "@/lib/asset-draft";
import { Button } from "@/components/ui/button";

const DirtyContext = createContext<((id: string, dirty: boolean) => void) | null>(null);
type TraversalEvent = Event & { navigationType: string; canIntercept: boolean; destination: { key: string; url: string; sameDocument: boolean } };
type NavigationSurface = EventTarget & { traverseTo(key: string): { finished: Promise<unknown> } };
const browserNavigation = () => (window as Window & { navigation?: NavigationSurface }).navigation;
export function useAssetFormGuard(dirty: boolean) {
  const id = useId(), update = useContext(DirtyContext);
  useEffect(() => { update?.(id, dirty); return () => update?.(id, false); }, [id, dirty, update]);
}
export function AssetUnsavedGuard({ children, draftScope }: { children: ReactNode; draftScope?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (draftScope) { try { isolateAssetDrafts(window.sessionStorage, draftScope); } catch { /* Storage disabled. */ } } }, [draftScope]);
  const [forms, setForms] = useState<Record<string, boolean>>({});
  const [draftIssues, setDraftIssues] = useState<Record<string, boolean>>({});
  const reportDraftIssue = useMemo(() => (form: string, unavailable: boolean) => setDraftIssues(current => current[form] === unavailable ? current : { ...current, [form]: unavailable }), []);
  const [target, setTarget] = useState<{ href: string; key?: string } | null>(null);
  const allowedTraversal = useRef<string | null>(null);
  const [navigationError, setNavigationError] = useState("");
  const [traversing, setTraversing] = useState(false);
  useEffect(() => { setTarget(null); allowedTraversal.current = null; setTraversing(false); setNavigationError(""); }, [pathname]);
  const update = useMemo(() => (id: string, dirty: boolean) => setForms(current => current[id] === dirty ? current : { ...current, [id]: dirty }), []);
  const dirty = Object.values(forms).some(Boolean);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.download || anchor.origin !== window.location.origin || anchor.href === window.location.href) return;
      event.preventDefault(); event.stopPropagation(); setNavigationError(""); setTarget({ href: anchor.pathname + anchor.search + anchor.hash });
    };
    const navigation = browserNavigation();
    const traverse = (raw: Event) => {
      const event = raw as TraversalEvent;
      if (event.navigationType !== "traverse") return;
      if (allowedTraversal.current === event.destination.key) { allowedTraversal.current = null; return; }
      // Older browsers and non-cancelable traversals must retain native behavior.
      // Do not insert history entries or rewrite Next's private history state.
      if (!event.cancelable || !event.canIntercept || !event.destination.sameDocument) { setTarget(null); allowedTraversal.current = null; return; }
      const url = new URL(event.destination.url);
      if (url.origin !== window.location.origin) return;
      event.preventDefault(); setNavigationError("");
      setTarget({ href: url.pathname + url.search + url.hash, key: event.destination.key });
    };
    navigation?.addEventListener("navigate", traverse);
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); navigation?.removeEventListener("navigate", traverse); };
  }, [dirty]);
  const discard = () => {
    if (!target || traversing) return;
    if (draftScope) { try { clearAssetRouteDrafts(window.sessionStorage, draftScope, pathname); } catch { /* Storage disabled. */ } }
    if (target.key) {
      const navigation = browserNavigation();
      if (!navigation) { setNavigationError("Navigation is unavailable. Stay and save your changes."); return; }
      allowedTraversal.current = target.key;
      setTraversing(true);
      try { void navigation.traverseTo(target.key).finished.then(() => setTarget(null)).catch(() => { allowedTraversal.current = null; setNavigationError("Could not leave this page. Your changes remain unsaved."); }).finally(() => setTraversing(false)); }
      catch { allowedTraversal.current = null; setTraversing(false); setNavigationError("Could not leave this page. Your changes remain unsaved."); }
      return;
    }
    const next = target.href; setForms({}); setTarget(null); router.push(next);
  };
  return <AssetDraftScope.Provider value={draftScope ?? null}><AssetDraftIssue.Provider value={reportDraftIssue}><DirtyContext.Provider value={update}>{dirty && Object.entries(draftIssues).some(([form, unavailable]) => unavailable && form.startsWith(`${pathname}:`)) ? <p role="alert" className="mx-4 my-2 rounded-[var(--sb-radius-control)] border border-warning px-3 py-2 text-xs text-warning">Browser draft recovery is unavailable. Save your changes before leaving.</p> : null}{children}{target ? <ModalShell open titleId="asset-unsaved-title" onClose={() => { if (!traversing) setTarget(null); }} className="max-w-md"><h2 id="asset-unsaved-title" className="text-sm font-semibold">Unsaved asset changes</h2><p className="mt-2 text-sm text-muted-foreground">Stay to save your changes, or discard them before leaving.</p>{navigationError ? <p role="alert" className="mt-2 text-sm">{navigationError}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={traversing} onClick={() => setTarget(null)}>Stay</Button><Button type="button" disabled={traversing} variant="outline" onClick={discard}>Discard & leave</Button></div></ModalShell> : null}</DirtyContext.Provider></AssetDraftIssue.Provider></AssetDraftScope.Provider>;
}
