import { createClient } from "@/lib/supabase/server";

export async function ensureBranchDefaultLocation(branchId: string) {
  return resolveDefaultLocation(branchId);
}

export async function resolveDefaultLocation(branchId: string | null | undefined, locationId?: string | null) {
  const selectedLocationId = String(locationId ?? "").trim();
  if (selectedLocationId) return selectedLocationId;

  const selectedBranchId = String(branchId ?? "").trim();
  if (!selectedBranchId) {
    throw new Error("Select a branch before posting stock movement.");
  }

  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, company_id, branch_code, default_location_id")
    .eq("id", selectedBranchId)
    .single();
  if (branchError) throw new Error(branchError.message);

  if (branch.default_location_id) {
    const { data: defaultLocation, error: defaultError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", branch.default_location_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();
    if (defaultError) throw new Error(defaultError.message);
    if (defaultLocation?.id) return defaultLocation.id;
  }

  const { data: firstLocation, error: firstError } = await supabase
    .from("locations")
    .select("id")
    .eq("branch_id", selectedBranchId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("location_name", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (firstError) throw new Error(firstError.message);
  if (firstLocation?.id) {
    await supabase.from("branches").update({ default_location_id: firstLocation.id }).eq("id", selectedBranchId);
    return firstLocation.id;
  }

  const codeSeed = (branch.branch_code ?? branch.id.slice(0, 8)).replace(/[^a-z0-9]+/gi, "-").toUpperCase();
  const fallbackCode = `DEF-${codeSeed}`;
  const { data: archivedOrMatching, error: archivedError } = await supabase
    .from("locations")
    .select("id")
    .eq("branch_id", selectedBranchId)
    .or(`location_code.eq.${fallbackCode},location_name.eq.Default Store,location_name.eq.Main Store`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (archivedError) throw new Error(archivedError.message);

  if (archivedOrMatching?.id) {
    const { error: restoreError } = await supabase
      .from("locations")
      .update({
        status: "active",
        deleted_at: null,
        location_code: fallbackCode,
        location_name: "Default Store",
        location_type: "dry_store",
      })
      .eq("id", archivedOrMatching.id);
    if (restoreError) throw new Error(`Could not restore this branch's default location: ${restoreError.message}`);
    await supabase.from("branches").update({ default_location_id: archivedOrMatching.id }).eq("id", selectedBranchId);
    return archivedOrMatching.id;
  }

  const { data: created, error: createError } = await supabase
    .from("locations")
    .insert({
      company_id: branch.company_id,
      branch_id: selectedBranchId,
      location_code: fallbackCode,
      location_name: "Default Store",
      location_type: "dry_store",
      status: "active",
    })
    .select("id")
    .single();
  if (createError) throw new Error(`Could not create this branch's default location: ${createError.message}`);

  await supabase.from("branches").update({ default_location_id: created.id }).eq("id", selectedBranchId);
  return created.id;
}
