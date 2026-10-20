"use server";
import { revalidatePath } from "next/cache";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission, hasPermission } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { assetMasterFields } from "@/lib/asset-master";
import { addDays } from "@/lib/production-planning/forecast";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assetAttachmentLimit, assetAttachmentTypes, assetAttachmentKinds, assetAttachmentSignature } from "@/lib/asset-attachments";
export type AssetActionState = { ok: boolean; message: string; assetId?: string; requestId?: string; photoError?: string };
const uuid = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Choose a valid asset and location.");
  return value;
};
export async function uploadAssetAttachment(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    const actor = await requireActiveTenantActor();
    const assetId = form.get("asset_id") ? uuid(form.get("asset_id")) : null, key = uuid(form.get("client_key"));
    const file = form.get("file"), label = String(form.get("label") ?? "").trim(), kind = String(form.get("kind") ?? "");
    const rawMaintenance = String(form.get("maintenance_id") ?? ""), maintenanceId = rawMaintenance ? uuid(rawMaintenance) : null;
    const uploadPermission = await hasPermission("assets.manage") ? "assets.manage" : await hasPermission("assets.report") ? "assets.report" : "assets.maintenance";
    await requirePermission(uploadPermission);
    if (uploadPermission !== "assets.manage" && (!maintenanceId || kind !== "Photo")) throw new Error("You may add photos to accessible maintenance records.");
    if (!(file instanceof File) || file.size === 0 || file.size > assetAttachmentLimit || !assetAttachmentTypes.some(type => type === file.type)) throw new Error("Choose a JPG, PNG, WebP or PDF file, up to 10 MB.");
    if (!label || label.length > 180 || !assetAttachmentKinds.some(value => value === kind)) throw new Error("Name the attachment and choose its type.");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!assetAttachmentSignature(file.type, bytes)) throw new Error("File content does not match its type.");
    const sha256 = createHash("sha256").update(bytes).digest("hex"), db = looseSupabase(await createClient());
    const reserve = () => db.rpc("reserve_asset_attachment", { p_asset: assetId, p_key: key, p_label: label, p_kind: kind, p_type: file.type, p_size: file.size, p_sha256: sha256, p_maintenance: maintenanceId });
    const result = await reserve();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Attachment could not be reserved.");
    const attachment = result.data as { id: string; storage_path: string; verified: boolean };
    if (!attachment.storage_path.startsWith(`${actor.companyId}/${assetId ?? `maintenance/${maintenanceId}`}/`) || !/^[0-9a-f-]{36}$/i.test(attachment.id)) throw new Error("Attachment location could not be verified.");
    if (!attachment.verified) {
      const admin = createAdminClient(), bucket = admin.storage.from("asset-documents");
      // Write-once paths make a retry safe. A failed upload may have reached
      // Storage, so verify the object itself instead of overwriting it.
      const upload = await bucket.upload(attachment.storage_path, bytes, { contentType: file.type, upsert: false });
      const stored = await bucket.download(attachment.storage_path);
      if (stored.error || !stored.data) throw new Error(upload.error ? "Upload did not finish. Retry with the same file." : "Stored attachment could not be verified. Retry with the same file.");
      const storedBytes = Buffer.from(await stored.data.arrayBuffer());
      if (storedBytes.length !== bytes.length || createHash("sha256").update(storedBytes).digest("hex") !== sha256 || !assetAttachmentSignature(file.type, storedBytes)) throw new Error("Stored attachment differs from the selected file. Verification stopped.");
      // Recheck the active actor and accessible holdings before the privileged
      // finalization. Pending files cannot be read through the user bucket API.
      const current = await requireActiveTenantActor(); await requirePermission(uploadPermission);
      if (current.companyId !== actor.companyId || current.staffId !== actor.staffId) throw new Error("Your session changed. Refresh before continuing.");
      const check = await reserve();
      if (check.error || !check.data || (check.data as { id?: unknown }).id !== attachment.id) throw new Error("Asset access changed. Attachment remains unverified.");
      const verified = await looseSupabase(admin).rpc("verify_native_asset_attachment", { p_company: actor.companyId, p_attachment: attachment.id, p_path: attachment.storage_path, p_sha256: sha256 });
      if (verified.error || verified.data !== true) throw new Error("Attachment verification did not finish. Retry with the same file.");
    }
    if (assetId) revalidatePath(`/asset-management/assets/${assetId}`);
    if (maintenanceId) revalidatePath(`/asset-management/maintenance/${maintenanceId}`);
    return { ok: true, message: "Attachment uploaded and verified.", assetId: assetId ?? undefined };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not upload attachment." }; }
}
export async function saveAssetMaster(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.manage");
    const name = String(form.get("item_name") ?? "").trim(), reason = String(form.get("reason") ?? "").trim();
    if (!name || name.length > 200 || !reason || reason.length > 2000) throw new Error("Enter the item name and reason.");
    const details: Record<string, string> = {};
    for (const field of assetMasterFields) {
      const value = String(form.get(`detail_${field.key}`) ?? "").trim();
      if (value.length > 1000) throw new Error(`${field.label} is too long.`);
      if (value && field.type === "date") addDays(value, 0);
      if (value && field.type === "number" && !/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter a nonnegative purchase price with at most two decimals.");
      details[field.key] = value;
    }
    if (details["Warranty Start Date"] && details["Warranty End Date"] && details["Warranty Start Date"] > details["Warranty End Date"]) throw new Error("Warranty end must follow its start.");
    const db = looseSupabase(await createClient());
    const clientKey = uuid(form.get("client_key"));
    const rawId = String(form.get("asset_id") ?? "");
    let response;
    if (rawId) {
      const expected = String(form.get("expected_updated_at") ?? "");
      if (!expected || !Number.isFinite(Date.parse(expected))) throw new Error("Refresh the asset before editing.");
      response = await db.rpc("update_asset_master", { p_asset: uuid(rawId), p_name: name, p_details: details, p_reason: reason, p_client_key: clientKey, p_expected_updated_at: expected });
    } else {
      const code = String(form.get("asset_code") ?? "").trim();
      const raw = String(form.get("quantity") ?? "").trim(), quantity = raw ? Number(raw) : null;
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(code) || (quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647))) throw new Error("Enter a valid asset ID and a whole physical quantity, or leave quantity unknown.");
      response = await db.rpc("create_asset_master", { p_code: code, p_name: name, p_location: uuid(form.get("location_id")), p_quantity: quantity, p_details: details, p_reason: reason, p_client_key: clientKey });
    }
    if (!rawId && response.error && "code" in response.error && response.error.code === "23505" && /unique constraint "(?:assets_company_id_asset_code_key|asset_code_case_unique)"/.test(response.error.message ?? "")) {
      throw new Error("An asset with this ID already exists. Open the existing asset to check whether your earlier registration succeeded.");
    }
    if (response.error || typeof response.data !== "string") throw new Error(response.error?.message ?? "Asset master was not confirmed.");
    revalidatePath("/asset-management", "layout");
    return { ok: true, message: rawId ? "Asset master updated. Original source and change history are preserved." : "Asset registered.", assetId: response.data };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not save asset master." }; }
}
export async function submitAssetChecklist(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.check");
    const ids = form.getAll("asset_id").map(uuid);
    if (ids.length === 0 || ids.length > 5000 || new Set(ids).size !== ids.length) throw new Error("Choose the assets to check.");
    const date = String(form.get("date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose the check date.");
    const lines = ids.map(id => {
      const raw = String(form.get(`quantity_${id}`) ?? "").trim();
      const quantity = raw ? Number(raw) : null;
      const result = String(form.get(`result_${id}`) ?? "");
      const remark = String(form.get(`remark_${id}`) ?? "").trim();
      if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 0)) throw new Error("Enter a whole physical count or leave it unknown.");
      if (!["Checked", "Damaged", "Missing", "Needs Maintenance", "Other"].includes(result) || remark.length > 4000 || (result !== "Checked" && !remark)) throw new Error("Choose a result and explain exceptions.");
      return { asset_id: id, quantity, result, remark };
    });
    const db = looseSupabase(await createClient());
    const response = await db.rpc("submit_asset_check", { p_location: uuid(form.get("location_id")), p_date: date, p_submission: uuid(form.get("submission_id")), p_lines: lines });
    if (response.error || !response.data) throw new Error(response.error?.message ?? "Checklist was not confirmed.");
    revalidatePath("/asset-management", "layout");
    return { ok: true, message: `${ids.length} asset checks saved. This outlet cannot submit again for this date.` };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not save checklist." }; }
}
export async function confirmUnknownAssetQuantity(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.manage");
    const raw = String(form.get("quantity") ?? "").trim(), quantity = raw ? Number(raw) : NaN;
    const reason = String(form.get("reason") ?? "").trim();
    if (!Number.isSafeInteger(quantity) || quantity < 0 || !reason || reason.length > 2000) throw new Error("Enter the physical count and confirmation note.");
    const db = looseSupabase(await createClient());
    const response = await db.rpc("confirm_unknown_asset_quantity", { p_asset: uuid(form.get("asset_id")), p_location: uuid(form.get("location_id")), p_quantity: quantity, p_reason: reason, p_client_key: uuid(form.get("client_key")) });
    if (response.error || !response.data) throw new Error(response.error?.message ?? "Count was not confirmed.");
    revalidatePath("/asset-management", "layout");
    return { ok: true, message: "Physical count confirmed. Original source quantity remains preserved." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not confirm count." }; }
}
export async function setAssetOperatingDay(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.manage");
    const date = String(form.get("date") ?? ""), reason = String(form.get("reason") ?? "").trim(), open = String(form.get("open") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["true", "false"].includes(open) || !reason || reason.length > 2000) throw new Error("Choose the operating date and enter the reason.");
    const db = looseSupabase(await createClient());
    const response = await db.rpc("set_asset_operating_day", { p_location: uuid(form.get("location_id")), p_date: date, p_open: open === "true", p_reason: reason });
    if (response.error || !response.data) throw new Error(response.error?.message ?? "Operating day was not confirmed.");
    revalidatePath("/asset-management", "layout");
    return { ok: true, message: "Operating day registered. Previous decisions remain in the history." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not register operating day." }; }
}
export async function requestAssetTransfer(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.transfer");
    const asset = uuid(form.get("asset_id")), from = uuid(form.get("from")), to = uuid(form.get("to"));
    const raw = form.get("quantity"); const quantity = typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    const reason = String(form.get("reason") ?? "").trim();
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || reason.length === 0 || reason.length > 2000) throw new Error("Enter a positive whole quantity and transfer reason.");
    const db = looseSupabase(await createClient());
    const result = await db.rpc("request_asset_transfer", { p_asset: asset, p_from: from, p_to: to, p_quantity: quantity, p_reason: reason, p_client_key: uuid(form.get("client_key")) });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Transfer was not confirmed.");
    revalidatePath("/asset-management"); revalidatePath(`/asset-management/assets/${asset}`);
    return { ok: true, message: "Transfer requested. Approval is required before dispatch." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not request transfer." }; }
}

export async function reportAssetMaintenance(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission(await hasPermission("assets.report") ? "assets.report" : "assets.maintenance");
    const description = String(form.get("description") ?? "").trim(), priority = String(form.get("priority") ?? "");
    if (description.length === 0 || description.length > 4000 || !["Low", "Normal", "High", "Urgent"].includes(priority)) throw new Error("Enter the issue and priority.");
    const selectedPhoto = form.get("photo");
    if (selectedPhoto instanceof File && selectedPhoto.size > 0) {
      uuid(form.get("photo_key"));
      if (selectedPhoto.size > assetAttachmentLimit || !["image/jpeg","image/png","image/webp"].includes(selectedPhoto.type) || !assetAttachmentSignature(selectedPhoto.type, Buffer.from(await selectedPhoto.arrayBuffer()))) throw new Error("Choose a valid JPG, PNG or WebP photo up to 10 MB.");
    }
    const db = looseSupabase(await createClient());
    const result = await db.rpc("report_asset_maintenance", { p_asset: form.get("asset_id") ? uuid(form.get("asset_id")) : null, p_location: uuid(form.get("location_id")), p_description: description, p_priority: priority, p_client_key: uuid(form.get("client_key")) });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Maintenance request was not confirmed.");
    revalidatePath("/asset-management", "layout");
    const requestId = uuid(result.data as string);
    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const attachment = new FormData();
      attachment.set("asset_id", String(form.get("asset_id") ?? ""));
      attachment.set("maintenance_id", requestId);
      attachment.set("client_key", uuid(form.get("photo_key")));
      attachment.set("file", photo); attachment.set("kind", "Photo");
      attachment.set("label", photo.name.slice(0,180) || "Problem photo");
      const uploaded = await uploadAssetAttachment({ok:false,message:""}, attachment);
      return {ok:true,requestId,message:"Request received · Open",photoError:uploaded.ok ? undefined : uploaded.message};
    }
    return { ok: true, requestId, message: "Request received · Open" };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not report maintenance." }; }
}
export async function updateAssetMaintenance(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor(); await requirePermission("assets.maintenance");
    const comment = String(form.get("comment") ?? "").trim(), status = String(form.get("status") ?? "");
    if (comment.length === 0 || comment.length > 4000 || !["Open", "Assigned", "Closed", "Resolved", "Cancelled"].includes(status)) throw new Error("Enter an update note and status.");
    const db = looseSupabase(await createClient());
    const result = await db.rpc("update_asset_maintenance", { p_request: uuid(form.get("request_id")), p_status: status, p_comment: comment, p_client_key: uuid(form.get("client_key")), p_expected_status: String(form.get("expected_status") ?? "") });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Maintenance update was not confirmed.");
    revalidatePath("/asset-management", "layout");
    revalidatePath("/", "layout");
    return { ok: true, message: "Maintenance update recorded." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not update maintenance." }; }
}
export async function advanceAssetTransfer(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    await requireActiveTenantActor();
    const action = String(form.get("action") ?? "");
    if (!["approve", "reject", "dispatch", "receive"].includes(action)) throw new Error("Choose a valid transfer action.");
    await requirePermission(action === "approve" || action === "reject" ? "assets.approve" : "assets.transfer");
    const transfer = uuid(form.get("transfer_id"));
    const note = String(form.get("note") ?? "").trim();
    if (note.length > 2000) throw new Error("Keep the transfer update note within 2,000 characters.");
    const db = looseSupabase(await createClient());
    const result = await db.rpc("advance_asset_transfer", { p_transfer: transfer, p_action: action, p_note: note });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Transfer update was not confirmed.");
    revalidatePath("/asset-management", "layout");
    return { ok: true, message: `Transfer ${action === "receive" ? "received" : action === "approve" ? "approved" : action === "reject" ? "rejected" : "dispatched"}.` };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not update transfer." }; }
}

export async function registerAssetOtherLocation(_previous: AssetActionState, form: FormData): Promise<AssetActionState> {
  try {
    const actor=await requireActiveTenantActor(); await requirePermission("assets.manage");
    if(actor.roleCode!=="super_admin")throw new Error("Only an asset owner may add a destination.");
    const name=String(form.get("name")??"").trim();
    if(name.length<2||name.length>120)throw new Error("Enter a location name between 2 and 120 characters.");
    const db=looseSupabase(await createClient());
    const result=await db.rpc("register_asset_other_location",{p_name:name});
    if(result.error||!result.data)throw new Error(result.error?.message??"Location could not be added.");
    revalidatePath("/asset-management/transfers/new");
    return {ok:true,message:`${name} is available in the destination list.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Location could not be added."};}
}
