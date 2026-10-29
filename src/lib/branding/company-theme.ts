export type CompanyTheme = { version: 1; primary: string };
const hex = /^#[0-9a-f]{6}$/i;
export function parseCompanyTheme(value: unknown): CompanyTheme | null {
  if (!value || typeof value !== "object") return null;
  const theme = value as Record<string, unknown>;
  return theme.version === 1 && typeof theme.primary === "string" && hex.test(theme.primary)
    ? { version: 1, primary: theme.primary.toLowerCase() } : null;
}
const rgb = (color: string) => [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
const color = (channels: number[]) => `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, amount: number) => color(rgb(a).map((channel, index) => channel * (1 - amount) + rgb(b)[index] * amount));
export function contrastRatio(a: string, b: string) {
  const lightness = (value: string) => rgb(value).map(channel => { const s = channel / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const [x, y] = [lightness(a), lightness(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function companyThemeTokens(value: unknown): Record<string, string> {
  const theme = parseCompanyTheme(value);
  if (!theme) return {};
  let primary = theme.primary;
  for (let step = 0; contrastRatio(primary, "#ffffff") < 4.5 && step < 40; step++) primary = mix(primary, "#000000", 0.08);
  const hover = mix(primary, "#000000", 0.15), deep = mix(primary, "#000000", 0.3), focus = primary;
  const highlight = mix(primary, "#ffffff", 0.92);
  let highlightText = primary;
  for (let step = 0; contrastRatio(highlightText, highlight) < 4.5 && step < 40; step++) highlightText = mix(highlightText, "#000000", 0.08);
  return {
    "--sb-green-950": deep, "--sb-green-900": primary, "--sb-green-900-rgb": rgb(primary).join(" "),
    "--sb-green-800": hover, "--sb-green-700": focus, "--sb-green-300": mix(primary, "#ffffff", 0.6),
    "--sb-green-200": mix(primary, "#ffffff", 0.8), "--sb-green-100": mix(primary, "#ffffff", 0.92), "--sb-green-050": mix(primary, "#ffffff", 0.96),
    "--sb-primary": primary, "--sb-primary-dark": deep, "--sb-accent": focus,
    "--sb-highlight": highlight, "--sb-highlight-text": highlightText,
    "--sb-disabled-bg": "#eef0f2", "--sb-disabled-text": "#58616b",
  };
}
