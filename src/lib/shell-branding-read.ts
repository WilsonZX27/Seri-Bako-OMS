type ShellBranding = { company_name: string; logo_url: string | null; ui_theme?: unknown };

// Branding is optional presentation; identity and permission reads remain required.
export async function readShellBranding(read: Promise<ShellBranding>, timeoutMs = 3_000): Promise<ShellBranding> {
  const fallback: ShellBranding = { company_name: "Operations", logo_url: null };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<ShellBranding>(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs); }),
    ]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
