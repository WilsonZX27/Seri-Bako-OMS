"use client";

import { ImageIcon, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";

type CompanyLogoFormProps = {
  companyId: string;
  logoUrl?: string | null;
  logoError?: string;
  uploadAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
  uploadFormId?: string;
  removeFormId?: string;
  showActions?: boolean;
};

export function CompanyLogoForm({
  companyId,
  logoUrl,
  logoError,
  uploadAction,
  removeAction,
  uploadFormId = "company-logo-upload-form",
  removeFormId = "company-logo-remove-form",
  showActions = true,
}: CompanyLogoFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const visibleLogo = previewUrl ?? logoUrl ?? null;

  const previewLabel = useMemo(() => (previewUrl ? "Selected logo preview" : "Current company logo"), [previewUrl]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle>Company Logo</CardTitle>
        <CardDescription>Upload a logo for the sidebar brand area. Maximum size is 2MB.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[2px] border bg-secondary">
            {visibleLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visibleLogo} alt={previewLabel} className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{visibleLogo ? previewLabel : "No logo uploaded"}</p>
            <p className="mt-0.5 text-[11px]">Accepted formats: PNG, JPG, JPEG, WEBP.</p>
          </div>
        </div>

        {logoError ? <p className="rounded-[2px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{logoError}</p> : null}

        <form id={uploadFormId} action={uploadAction} className="space-y-3">
          <input type="hidden" name="company_id" value={companyId} />
          <Field label="Logo image">
            <Input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
            />
          </Field>
          {showActions ? (
            <div className="flex flex-wrap justify-end gap-2">
              <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">
                <Upload className="h-4 w-4" />
                Upload logo
              </SubmitButton>
            </div>
          ) : null}
        </form>
        {logoUrl && showActions ? (
          <div id={removeFormId} className="flex justify-end">
            <DestructiveActionDialog action={removeAction} label="Remove logo" title="Remove company logo?" description="The current company logo will no longer appear in the application." pendingLabel="Removing..." compact />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
