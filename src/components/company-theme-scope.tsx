"use client";
import { useEffect } from "react";
import { companyThemeTokens } from "@/lib/branding/company-theme";
// Portalled sheets inherit from html; SSR canvas receives the same tokens.
export function CompanyThemeScope({ theme }: { theme: unknown }) {
  useEffect(() => {
    const root = document.documentElement, tokens = companyThemeTokens(theme);
    const previous = Object.fromEntries(Object.keys(tokens).map(key => [key, root.style.getPropertyValue(key)]));
    for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);
    return () => { for (const [key, value] of Object.entries(previous)) { if (value) root.style.setProperty(key, value); else root.style.removeProperty(key); } };
  }, [theme]);
  return null;
}
