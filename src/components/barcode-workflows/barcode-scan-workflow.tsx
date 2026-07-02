"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarcodeFields } from "@/components/barcode-fields";

type LookupResult = {
  found: boolean;
  barcode: string;
  stock_entity_type?: "item" | "product";
  id?: string;
  code?: string;
  name?: string;
  uom?: string;
  image_url?: string | null;
  current_stock?: number;
};

type CountLine = LookupResult & {
  lineKey: string;
  quantity: number;
  reason?: string;
};

export function BarcodeScanWorkflow({
  title,
  description,
  mode,
}: {
  title: string;
  description: string;
  mode: "stock_count" | "goods_receiving" | "stock_transfer" | "stock_wastage";
}) {
  const [barcode, setBarcode] = useState("");
  const [scanMode, setScanMode] = useState<"search" | "camera">("search");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [current, setCurrent] = useState<LookupResult | null>(null);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const needsReason = mode === "stock_wastage";
  const receivingWarning = mode === "goods_receiving" && current?.found;

  const actionLabel = useMemo(() => {
    if (mode === "stock_count") return "Save count line";
    if (mode === "goods_receiving") return "Save received line";
    if (mode === "stock_transfer") return "Save transfer line";
    return "Save wastage line";
  }, [mode]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  async function lookup(value = barcode) {
    const code = value.trim();
    if (!code) {
      setMessage("Scan or enter a barcode first.");
      return;
    }
    const response = await fetch(`/api/barcodes/lookup?barcode=${encodeURIComponent(code)}`);
    const result = (await response.json()) as LookupResult;
    setCurrent(result);
    setBarcode(result.barcode);
    setMessage(result.found ? `${result.name} found. Enter quantity.` : `Unknown barcode ${result.barcode}.`);
  }

  function saveLine() {
    if (!current?.found || !current.id || !current.stock_entity_type) {
      setMessage("Unknown barcode. Create or link an item before saving.");
      return;
    }
    const lineKey = `${current.stock_entity_type}:${current.id}`;
    setLines((previous) => {
      const existing = previous.find((line) => line.lineKey === lineKey);
      if (existing) {
        return previous.map((line) => (line.lineKey === lineKey ? { ...line, quantity, reason } : line));
      }
      return [...previous, { ...current, lineKey, quantity, reason }];
    });
    void fetch("/api/barcodes/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: current.stock_entity_type,
        entityId: current.id,
        barcode: current.barcode,
        workflow: mode,
        quantity,
      }),
    });
    setMessage("Line saved. Ready for next scan.");
    setCurrent(null);
    setBarcode("");
    setQuantity(1);
    setReason("");
  }

  return (
    <div className="p-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="rounded-lg border bg-secondary/30 p-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  ["search", "Search"],
                  ["camera", "Camera"],
                ].map(([key, label]) => (
                  <Button key={key} type="button" variant={scanMode === key ? "default" : "outline"} size="sm" onClick={() => setScanMode(key as "search" | "camera")}>
                    {label}
                  </Button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  ref={barcodeInputRef}
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" ? (event.preventDefault(), lookup()) : undefined}
                  placeholder="Search item code, item name, or barcode"
                />
                <Button type="button" onClick={() => lookup()}>
                  <ScanLine className="mr-2 h-4 w-4" />
                  {scanMode === "search" ? "Search" : "Lookup"}
                </Button>
              </div>
              {scanMode === "camera" ? (
                <div className="mt-3 rounded-md border bg-card p-3">
                  {!cameraStarted ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">Camera access starts only after you choose Start camera.</p>
                      <Button type="button" variant="secondary" onClick={() => setCameraStarted(true)}>Start camera</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">If the browser asks for permission, allow camera access for scanning. You can still search manually above.</p>
                      <BarcodeFields barcode={barcode} barcodeType="internal" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              Search by item code, item name, or barcode. Type or scan into the search field, then press Enter. Camera mode is optional for devices with a camera.
            </p>
            {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}

            {current?.found ? (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-secondary text-xs text-muted-foreground">Image</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase text-muted-foreground">{current.stock_entity_type}</p>
                    <h2 className="truncate font-semibold">{current.name}</h2>
                    <p className="text-sm text-muted-foreground">{current.code} - {current.uom}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Current stock: {current.current_stock ?? 0} {current.uom}</p>
                  </div>
                </div>
                {receivingWarning ? <p className="mt-3 rounded-md bg-warning/10 p-2 text-xs text-warning">Match this scanned item against the PO line before posting receiving. Warn if it is not in the PO.</p> : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                  <div className="flex items-center rounded-md border">
                    <Button type="button" variant="ghost" onClick={() => setQuantity((value) => Math.max(0, value - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input className="border-0 text-center" type="number" min="0" step="0.0001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
                    <Button type="button" variant="ghost" onClick={() => setQuantity((value) => value + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {needsReason ? <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" /> : null}
                  <Button type="button" className="sm:col-span-2" onClick={saveLine}>{actionLabel} / Next scan</Button>
                </div>
              </div>
            ) : current && !current.found ? (
              <div className="rounded-lg border bg-card p-4">
                <p className="font-semibold">Unknown barcode</p>
                <p className="mt-1 text-sm text-muted-foreground">Create or link this barcode if you have permission.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link href={`/items/new?barcode=${encodeURIComponent(current.barcode)}`}>Create item</Link></Button>
                  <Button asChild variant="outline"><Link href={`/products/new?barcode=${encodeURIComponent(current.barcode)}`}>Create product</Link></Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Scanned Lines</p>
          </div>
          <div className="divide-y">
            {lines.map((line) => (
              <div key={line.lineKey} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-muted-foreground">{line.code} - {line.stock_entity_type}</p>
                </div>
                <p className="font-semibold">{line.quantity} {line.uom}</p>
              </div>
            ))}
            {!lines.length ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">No scanned lines yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
