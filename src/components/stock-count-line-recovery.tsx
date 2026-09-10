"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

type ItemOption = {
  id: string;
  item_code: string;
  item_name: string;
  base_unit: string;
};

export function StockCountLineRecovery({
  action,
  line,
  items,
  reviewMode,
  menuTrigger = false,
  initialOpenMode,
}: {
  action: (formData: FormData) => void | Promise<void>;
  line: { id: string; item_id: string; physical_qty: number; uom: string };
  items: ItemOption[];
  reviewMode: boolean;
  menuTrigger?: boolean;
  initialOpenMode?: "replace" | "remove";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"replace" | "remove">("replace");
  const [replacementItemId, setReplacementItemId] = useState(line.item_id);
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const replacementItem = items.find((item) => item.id === replacementItemId);

  useEffect(() => {
    if (!initialOpenMode) return;
    setMode(initialOpenMode);
    setOpen(true);
  }, [initialOpenMode]);

  function openMode(nextMode: "replace" | "remove") {
    setMode(nextMode);
    setRemoveConfirmed(false);
    setOpen(true);
  }

  function switchMode(nextMode: "replace" | "remove") {
    setMode(nextMode);
    setRemoveConfirmed(false);
  }

  return (
    <>
      {menuTrigger ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-[var(--sb-surface-muted)]"
            onClick={(event) => {
              event.stopPropagation();
              openMode("replace");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Replace item
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]"
            onClick={(event) => {
              event.stopPropagation();
              openMode("remove");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove from this count
          </button>
        </>
      ) : (
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit this stock count line"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        triggerRef={triggerRef}
        initialFocusRef={cancelRef}
        className="max-w-md"
      >
        <form action={action}>
          <input type="hidden" name="line_id" value={line.id} />
          <input type="hidden" name="revision_action" value={mode} />
          <input type="hidden" name="idempotency_key" value={key} />
          <header>
            <h2
              id={titleId}
              className="flex items-center gap-2 text-base font-semibold"
            >
              {mode === "remove" ? (
                <Trash2 className="h-4 w-4 text-[var(--sb-danger)]" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {mode === "remove"
                ? "Remove count line?"
                : reviewMode
                  ? "Propose a line correction"
                  : "Replace count item"}
            </h2>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              The original values remain in revision history. Nothing changes
              until you confirm.
            </p>
          </header>
          <div className="mt-4 space-y-4">
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-label="Change type"
            >
              <Button
                type="button"
                variant={mode === "replace" ? "default" : "outline"}
                onClick={() => switchMode("replace")}
              >
                <RefreshCw className="h-4 w-4" />
                Replace item
              </Button>
              <Button
                type="button"
                variant={mode === "remove" ? "destructive" : "outline"}
                onClick={() => switchMode("remove")}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
            {mode === "replace" ? (
              <>
                <label className="block text-sm font-medium">
                  Replacement item
                  <SelectControl
                    name="item_id"
                    value={replacementItemId}
                    onValueChange={setReplacementItemId}
                    ariaLabel="Replacement item"
                    className="mt-1"
                    searchable
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.item_code} — ${item.item_name}`,
                    }))}
                  />
                </label>
                <input type="hidden" name="quantity" value="" />
                <input
                  type="hidden"
                  name="uom"
                  value={replacementItem?.base_unit ?? ""}
                />
                <p className="rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-muted)] p-2.5 text-xs leading-4">
                  The replacement starts blank. Count it physically before
                  posting.
                </p>
              </>
            ) : (
              <label className="flex items-start gap-2 rounded-[var(--sb-control-radius)] border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-3 text-xs leading-4 text-[var(--sb-danger)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={removeConfirmed}
                  onChange={(event) => setRemoveConfirmed(event.target.checked)}
                />
                <span>
                  <strong className="block">
                    Confirm removal from this count
                  </strong>
                  This removes only this Count line. Item Master and inventory
                  history remain unchanged.
                </span>
              </label>
            )}
            <label className="block text-sm font-medium">
              Reason
              <Input
                name="reason"
                minLength={3}
                required
                placeholder="What changed and why?"
                className="mt-1"
              />
            </label>
          </div>
          <footer className="mt-5 grid grid-cols-2 gap-2">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              variant={mode === "remove" ? "destructive" : "default"}
              pendingLabel="Saving…"
              showOverlay
              overlayLabel="Saving line change..."
              disabled={mode === "remove" && !removeConfirmed}
            >
              {reviewMode
                ? "Submit proposal"
                : mode === "remove"
                  ? "Remove line"
                  : "Replace item"}
            </SubmitButton>
          </footer>
        </form>
      </ModalShell>
    </>
  );
}
