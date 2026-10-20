"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useAssetFeedback } from "@/components/asset-action-feedback";
import { usePathname } from "next/navigation";
import { clearAssetDraft, readAssetDraft, writeAssetDraft } from "@/lib/asset-draft";

export const AssetDraftScope = createContext<string | null>(null);
export const AssetDraftIssue = createContext<((form: string, unavailable: boolean) => void) | null>(null);
export function useAssetDraftAction<T extends { ok: boolean; message: string; photoError?: string }>(form: string, action: (previous: T, data: FormData) => Promise<T>) {
  const scope = useContext(AssetDraftScope), pathname = usePathname(), publish = useAssetFeedback();
  // Retain the submitted identity on an unconfirmed transport failure. Retrying
  // this same form must not turn a possibly completed write into a new request.
  const uncertain = useRef<FormData | null>(null);
  return useCallback(async (previous: T, data: FormData): Promise<T> => {
    if (uncertain.current) data = uncertain.current;
    publish?.({ path: pathname, tone: "pending", message: form.startsWith("attachment:") ? "Uploading…" : "Saving…" });
    let result: T;
    try {
      result = await action(previous, data);
      uncertain.current = null;
    } catch {
      uncertain.current = data;
      result = { ...previous, ok: false, message: form.startsWith("attachment:") ? "Could not confirm the upload. Your label is kept. Select the same file again, then retry to check or finish the original upload." : "Could not confirm the result. Your inputs are kept. Retry checks or finishes the original submitted values." };
    }
    // Clear before the refreshed history can remount the keyed form.
    if (result.ok && scope) { try { clearAssetDraft(window.sessionStorage, scope, `${pathname}:${form}`); } catch { /* Storage disabled. */ } }
    publish?.({ path: pathname, tone: result.ok && !result.photoError ? "success" : "error", message: result.photoError ? `${result.message} The photo was not uploaded. ${result.photoError}` : result.message });
    return result;
  }, [action, scope, pathname, form, publish]);
}
export function useAssetDraftFields<T extends Record<string, string>>(form: string, revision: string, initial: T, saved: boolean, validate?: (value: T) => boolean): [T, <K extends keyof T>(key: K, value: T[K]) => void, boolean] {
  const [fields, setFields, restored] = useAssetDraftState(form, revision, initial, (value): value is T => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const row = value as T;
    return Object.keys(row).length === Object.keys(initial).length && Object.keys(initial).every(key => typeof row[key] === "string" && row[key].length <= 4000) && (!validate || validate(row));
  }, saved);
  return [fields, (key, value) => setFields(previous => ({ ...previous, [key]: value })), restored];
}
/** Restore only input values. Request keys, authorization and saved records remain server-owned. */
export function useAssetDraftState<T>(form: string, revision: string, initial: T, valid: (value: unknown) => value is T, saved: boolean): [T, Dispatch<SetStateAction<T>>, boolean] {
  const scope = useContext(AssetDraftScope);
  const reportIssue = useContext(AssetDraftIssue);
  const pathname = usePathname();
  form = `${pathname}:${form}`;
  const [value, setValue] = useState(initial), [restored, setRestored] = useState(false);
  const current = useRef(value), initialRef = useRef(initial), validRef = useRef(valid);
  initialRef.current = initial;
  validRef.current = valid;
  useEffect(() => {
    if (!scope) return;
    try {
      const draft = readAssetDraft(window.sessionStorage, scope, form, revision, validRef.current);
      const next = draft ?? initialRef.current;
      current.current = next; setValue(next); setRestored(draft !== undefined);
    } catch { /* Normal editing remains available when Storage is disabled. */ }
  }, [scope, form, revision]);
  useEffect(() => {
    if (!saved || !scope) return;
    try { clearAssetDraft(window.sessionStorage, scope, form); } catch { /* Storage unavailable. */ }
    setRestored(false);
  }, [saved, scope, form]);
  const update: Dispatch<SetStateAction<T>> = next => {
    const updated = typeof next === "function" ? (next as (previous: T) => T)(current.current) : next;
    current.current = updated;
    if (scope && !saved) {
      try { reportIssue?.(form, !writeAssetDraft(window.sessionStorage, scope, form, revision, updated)); }
      catch { reportIssue?.(form, true); }
    }
    setValue(updated);
  };
  return [value, update, restored];
}
