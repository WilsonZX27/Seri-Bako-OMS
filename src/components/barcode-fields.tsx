"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Search, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

type BarcodeDetectorShape = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorShape;

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const candidate = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return candidate ?? null;
}

function BarcodePreview({ value }: { value: string }) {
  const bars = useMemo(() => {
    const seed = value || "SERIBAKO";
    return Array.from({ length: 42 }, (_, index) => {
      const code = seed.charCodeAt(index % seed.length) + index * 7;
      return code % 4 === 0 ? 4 : code % 3 === 0 ? 3 : code % 2 === 0 ? 2 : 1;
    });
  }, [value]);

  return (
    <div className="rounded-md border bg-white p-3">
      <div className="flex h-14 items-end gap-px">
        {bars.map((width, index) => (
          <span key={`${value}-${index}`} className="block h-full bg-foreground" style={{ width }} />
        ))}
      </div>
      <p className="mt-2 truncate text-center font-mono text-xs text-muted-foreground">{value || "No barcode"}</p>
    </div>
  );
}

export function BarcodeFields({
  barcode,
  qrCode,
  supplierBarcode,
  internalBarcode,
  barcodeType,
  barcodeImageUrl,
  showSupplierBarcode = false,
}: {
  barcode?: string | null;
  qrCode?: string | null;
  supplierBarcode?: string | null;
  internalBarcode?: string | null;
  barcodeType?: string | null;
  barcodeImageUrl?: string | null;
  showSupplierBarcode?: boolean;
}) {
  const [value, setValue] = useState(barcode ?? "");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let frame = 0;

    async function start() {
      const Detector = getBarcodeDetector();
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera scanning is not available in this browser. Search by item code, item name, or barcode instead.");
        setScanning(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new Detector({ formats: ["ean_13", "upc_a", "qr_code", "code_128"] });
      const scan = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const rawValue = results[0]?.rawValue;
          if (rawValue) {
            setValue(rawValue);
            setMessage(`Scanned ${rawValue}`);
            setScanning(false);
            return;
          }
        } catch {
          setMessage("Scanning is active. Keep the barcode inside the camera frame.");
        }
        frame = window.requestAnimationFrame(scan);
      };
      frame = window.requestAnimationFrame(scan);
    }

    start().catch(() => {
      setMessage("Camera permission was denied or unavailable. Search by item code, item name, or barcode instead.");
      setScanning(false);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [scanning]);

  return (
    <div className="grid gap-4 rounded-lg border bg-secondary/30 p-4 md:col-span-full md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Search</p>
            <p className="text-xs text-muted-foreground">Search item code, item name, or barcode. Type or scan into the search field, then press Enter where lookup is available.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById("barcode-input")?.focus()}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
        <details className="mb-3 rounded-md border bg-card p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Advanced / Camera</summary>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Camera scanning is optional. Search stays available even if this device does not support camera scanning.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setScanning(true)}>
              <Camera className="mr-2 h-4 w-4" />
              Open camera
            </Button>
          </div>
        </details>
        {scanning ? (
          <div className="mb-4 overflow-hidden rounded-lg border bg-black">
            <div className="flex items-center justify-between bg-card px-3 py-2 text-sm">
              <span className="flex items-center gap-2"><ScanLine className="h-4 w-4" /> Camera scan mode</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setScanning(false)}><X className="h-4 w-4" /></Button>
            </div>
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
        ) : null}
        {message ? <p className="mb-3 text-xs text-muted-foreground">{message}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Manual Barcode">
            <Input id="barcode-input" name="barcode" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Type or scan barcode" />
          </Field>
          <Field label="Barcode Type">
            <SelectNative name="barcode_type" defaultValue={barcodeType ?? "internal"}>
              <option value="ean13">EAN-13</option>
              <option value="upc">UPC</option>
              <option value="qr">QR</option>
              <option value="internal">Internal</option>
              <option value="supplier">Supplier</option>
              <option value="packaging">Packaging</option>
              <option value="other">Other</option>
            </SelectNative>
          </Field>
          <Field label="QR Code">
            <Input name="qr_code" defaultValue={qrCode ?? ""} />
          </Field>
          <Field label="Internal Barcode">
            <Input name="internal_barcode" defaultValue={internalBarcode ?? ""} />
          </Field>
          {showSupplierBarcode ? (
            <Field label="Supplier Barcode">
              <Input name="supplier_barcode" defaultValue={supplierBarcode ?? ""} />
            </Field>
          ) : null}
          <Field label="Barcode Image URL">
            <Input name="barcode_image_url" defaultValue={barcodeImageUrl ?? ""} placeholder="Optional image URL" />
          </Field>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Barcode Preview</p>
        <BarcodePreview value={value || internalBarcode || qrCode || ""} />
      </div>
    </div>
  );
}
