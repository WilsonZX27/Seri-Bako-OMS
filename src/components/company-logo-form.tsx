"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type CompanyLogoFormProps = {
  companyId: string;
  logoUrl?: string | null;
  logoError?: string;
  uploadAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
};

export function CompanyLogoForm({
  companyId,
  logoUrl,
  logoError,
  uploadAction,
  removeAction,
}: CompanyLogoFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const visibleLogo = previewUrl ?? logoUrl ?? null;

  const previewLabel = useMemo(() => (previewUrl ? "Selected logo preview" : "Current company logo"), [previewUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Logo</CardTitle>
        <CardDescription>Upload a logo for the sidebar brand area. Maximum size is 2MB.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-secondary">
            {visibleLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visibleLogo} alt={previewLabel} className="h-full w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{visibleLogo ? previewLabel : "No logo uploaded"}</p>
            <p>Accepted formats: PNG, JPG, JPEG, WEBP, SVG.</p>
          </div>
        </div>

        {logoError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{logoError}</p> : null}

        <form action={uploadAction} className="space-y-3">
          <input type="hidden" name="company_id" value={companyId} />
          <Field label="Logo image">
            <Input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">
              <Upload className="h-4 w-4" />
              Upload logo
            </SubmitButton>
          </div>
        </form>
        {logoUrl ? (
          <form action={removeAction} className="flex justify-end">
            <SubmitButton type="submit" variant="outline" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">
              <Trash2 className="h-4 w-4" />
              Remove
            </SubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
