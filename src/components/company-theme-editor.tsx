"use client";
import { useState, type CSSProperties } from "react";
import { parseCompanyTheme, companyThemeTokens } from "@/lib/branding/company-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
export function CompanyThemeEditor({ theme, installed, canManage, action }: { theme: unknown; installed: boolean; canManage: boolean; action: (form: FormData) => Promise<void> }) {
  const [primary, setPrimary] = useState(parseCompanyTheme(theme)?.primary ?? "#074b37");
  const preview = companyThemeTokens({ version: 1, primary });
  return <section className="sb-work-surface p-4" aria-labelledby="company-theme-heading">
    <h2 id="company-theme-heading" className="text-sm font-semibold">Company colours</h2>
    <p className="mt-1 text-xs text-muted-foreground">One palette for everyone in this company. Preview before saving.</p>
    <form action={action} className="mt-4 space-y-4">
      <label className="grid gap-2 text-xs font-medium">Primary colour<div className="flex items-center gap-3"><input type="color" name="primary" value={primary} onChange={event => setPrimary(event.target.value)} disabled={!canManage} aria-label="Primary colour" className="h-11 w-16 cursor-pointer rounded border bg-white p-1"/><Input aria-label="Primary colour hex" value={primary} readOnly className="max-w-40 font-mono"/></div></label>
      <div className="flex flex-wrap gap-2" aria-label="Colour presets">{["#074b37", "#254b91", "#624399", "#9a4730", "#34404c"].map(value => <button key={value} type="button" disabled={!canManage} aria-label={`Use ${value}`} aria-pressed={value === primary} onClick={() => setPrimary(value)} style={{ background: value }} className="h-11 w-11 rounded-[var(--sb-control-radius)] border border-[var(--sb-border)] ring-offset-2 focus-visible:ring-2 focus-visible:ring-black aria-pressed:ring-2 aria-pressed:ring-black"/>)}</div>
      <div style={preview as CSSProperties} className="space-y-3 rounded-[var(--sb-panel-radius)] border border-[var(--sb-border)] p-4" aria-label="Palette preview">
        <h3 className="text-sm font-semibold">Preview</h3><div className="flex flex-wrap gap-2"><Button type="button">Primary action</Button><Button type="button" variant="outline">Secondary</Button><Button type="button" disabled>Unavailable</Button></div>
        <div className="rounded-[var(--sb-control-radius)] bg-[var(--sb-highlight)] p-3 text-xs text-[var(--sb-highlight-text)]">Selected item</div>
        <div className="flex flex-wrap gap-2"><StatusBadge status="active"/><StatusBadge status="pending"/><Button type="button" variant="destructive">Delete</Button></div>
      </div>
      {!installed ? <p role="status" className="text-xs text-muted-foreground">Preview only. Company-wide colour saving is not yet enabled.</p> : null}
      <div className="flex flex-wrap gap-2"><SubmitButton type="submit" disabled={!installed || !canManage} pendingLabel="Saving colours...">Save company colours</SubmitButton><Button type="submit" name="reset" value="yes" variant="outline" disabled={!installed || !canManage}>Restore default</Button><Button type="button" variant="ghost" onClick={() => setPrimary(parseCompanyTheme(theme)?.primary ?? "#074b37")}>Reset preview</Button></div>
    </form>
  </section>;
}
