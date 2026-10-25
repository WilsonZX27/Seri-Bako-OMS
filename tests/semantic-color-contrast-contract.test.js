import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("src/app/globals.css", "utf8") + readFileSync("src/app/design-system-v2.css", "utf8");
const procurement = readFileSync("src/app/(app)/reports/procurement-variance/page.tsx", "utf8");
const sidebar = readFileSync("src/components/layout/workspace-sidebar.tsx", "utf8");

function hex(variable) {
  const match = globals.match(new RegExp(`--${variable}:\\s*(#[0-9A-Fa-f]{6})`));
  if (match) return match[1];
  const alias = globals.match(new RegExp(`--${variable}:\\s*rgb\\(var\\(--([\\w-]+)\\)\\)`));
  assert.ok(alias, `${variable} must resolve to a canonical color`);
  const channels = globals.match(new RegExp(`--${alias[1]}:\\s*(\\d+) (\\d+) (\\d+)`));
  assert.ok(channels, `${variable} must resolve to RGB channels`);
  return "#" + channels.slice(1, 4).map(value => Number(value).toString(16).padStart(2, "0")).join("");
}

function rgb(value) {
  return value.slice(1).match(/../g).map((part) => Number.parseInt(part, 16));
}

function luminance(color) {
  const values = rgb(color).map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test("semantic status text and muted body text retain WCAG AA contrast", () => {
  for (const [foreground, background] of [
    ["sb-text-muted", "sb-surface"],
    ["sb-success", "sb-success-bg"],
    ["sb-danger", "sb-danger-bg"],
    ["sb-info", "sb-info-bg"],
    ["sb-neutral-text", "sb-neutral-bg"],
  ]) assert.ok(contrast(hex(foreground), hex(background)) >= 4.5, `${foreground} on ${background} must be at least 4.5:1`);
});

test("small procurement labels and sidebar release text avoid known low-contrast styles", () => {
  assert.match(procurement, /text-\[10px\][^"\n]*text-\[var\(--sb-text-muted\)\]/);
  assert.doesNotMatch(procurement, /text-\[10px\][^"\n]*text-\[var\(--sb-text-soft\)\]/);
  assert.match(sidebar, /APP_RELEASE_NOTE[\s\S]*?text-white\/70|text-white\/70[^\n]*APP_RELEASE_NOTE/);
  assert.doesNotMatch(sidebar, /text-white\/45[^\n]*APP_RELEASE_NOTE/);
});
