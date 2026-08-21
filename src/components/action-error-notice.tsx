"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type ActionErrorNoticeProps = {
  message?: string;
  action?: ReactNode;
};

const FIELD_TARGETS: Array<{ pattern: RegExp; selectors: string[] }> = [
  { pattern: /request branch|branch/i, selectors: ["[name=\"branch_id\"]", "[name=\"from_branch_id\"]"] },
  { pattern: /count date/i, selectors: ["[name=\"count_date\"]"] },
  { pattern: /needed by date/i, selectors: ["[name=\"needed_by_date\"]"] },
  { pattern: /counted quantity/i, selectors: ["[name=\"physical_qty\"]"] },
  { pattern: /expected quantity/i, selectors: ["[name=\"theoretical_qty\"]"] },
  { pattern: /tolerance/i, selectors: ["[name=\"tolerance_percent\"]"] },
  { pattern: /supplier/i, selectors: ["[name=\"request_supplier_id\"]", "[name=\"supplier_id\"]"] },
  { pattern: /autocount po number|po number/i, selectors: ["[name=\"autocount_po_no\"]"] },
  { pattern: /uom|unit of measure/i, selectors: ["[name=\"line_uom\"]", "[name=\"uom\"]"] },
  { pattern: /quantity/i, selectors: ["[name=\"line_qty\"]", "[name=\"qty\"]", "[name=\"quantity\"]", "[name=\"physical_qty\"]"] },
  { pattern: /reason/i, selectors: ["[name=\"reason\"]"] },
  { pattern: /remarks|note/i, selectors: ["[name=\"remarks\"]"] },
  { pattern: /item|requested items/i, selectors: ["[name=\"item_id\"]", "[aria-label*=\"item\" i]"] },
];

function firstVisibleTarget(selectors: string[]) {
  for (const selector of selectors) {
    const match = Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
      if (element instanceof HTMLInputElement && element.type === "hidden") return false;
      const disclosure = element.closest("details");
      if (disclosure && !disclosure.open) disclosure.open = true;
      return element.getAttribute("aria-hidden") !== "true" && element.offsetParent !== null;
    });
    if (match) return match;
  }
  return null;
}

export function ActionErrorNotice({ message, action }: ActionErrorNoticeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;
    const targetConfig = FIELD_TARGETS.find(({ pattern }) => pattern.test(message));
    const target = targetConfig ? firstVisibleTarget(targetConfig.selectors) : null;
    const highlighted = target;
    if (target) {
      target.classList.add("border-rose-500", "ring-2", "ring-rose-200");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.focus({ preventScroll: true }), 180);
    } else {
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return () => {
      highlighted?.classList.remove("border-rose-500", "ring-2", "ring-rose-200");
    };
  }, [message]);

  if (!message) return null;

  return (
    <div ref={wrapperRef}>
      <Card data-action-error role="alert" aria-live="assertive" className="border-[var(--sb-danger)] bg-[var(--sb-danger-bg)]">
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm text-destructive">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 break-words">{message}</p>
          </div>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}
