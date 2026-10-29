-- REVIEW PACKAGE ONLY. No remote installation. Exact live schema/function/ACL/trigger
-- snapshots and a reviewed restoration package remain required before activation.
-- Old endpoints remain callable. The new endpoint appends; the guard also protects
-- older clients and closed-to-open transitions. Existing duplicate history stays.
BEGIN;
DO $review$ BEGIN RAISE EXCEPTION 'Review only: verify live drift and authorize activation before removing this guard'; END $review$;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.enforce_one_open_asset_repair() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.asset_id IS NULL OR lower(coalesce(NEW.status,'')) IN ('closed','resolved','cancelled') THEN RETURN NEW; END IF;
 -- Updating an already-open legacy row keeps its history; reopening or moving it
 -- to another asset/company must satisfy the new rule.
 IF TG_OP='UPDATE' THEN
  IF OLD.company_id=NEW.company_id AND OLD.asset_id=NEW.asset_id
   AND lower(coalesce(OLD.status,'')) NOT IN ('closed','resolved','cancelled') THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text||'/open-asset-repair/'||NEW.asset_id::text,0));
 IF EXISTS(SELECT 1 FROM public.asset_maintenance WHERE company_id=NEW.company_id AND asset_id=NEW.asset_id
   AND id<>NEW.id AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled')) THEN
  RAISE EXCEPTION 'This asset already has an unresolved repair. Append to that request.';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_one_open_asset_repair() FROM public,anon,authenticated;
CREATE TRIGGER one_open_asset_repair_guard BEFORE INSERT OR UPDATE OF company_id,asset_id,status
 ON public.asset_maintenance FOR EACH ROW EXECUTE FUNCTION public.enforce_one_open_asset_repair();

CREATE OR REPLACE FUNCTION public.asset_check_exception_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE existing public.asset_maintenance;
BEGIN
 IF NEW.result='Checked' THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text||'/open-asset-repair/'||NEW.asset_id::text,0));
 SELECT * INTO existing FROM public.asset_maintenance WHERE company_id=NEW.company_id AND asset_id=NEW.asset_id
 AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled') ORDER BY created_at DESC,id DESC LIMIT 1;
 IF FOUND THEN
  INSERT INTO public.asset_maintenance_updates(company_id,maintenance_id,source_id,author_name,source_data)
  VALUES(NEW.company_id,existing.id,'CHECK-'||NEW.id,NEW.author_name,jsonb_build_object(
   'Update Type','Daily inspection','Checklist ID',NEW.id,'Inspection location',NEW.location_id,
   'Inspection result',NEW.result,'Comment',NEW.source_data->>'remark','Actor ID',public.current_staff_id(),
   'Status Before',existing.status,'Status After',existing.status,'Update Date',now()))
  ON CONFLICT(company_id,source_id) DO NOTHING;
 ELSE
  INSERT INTO public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
  VALUES(NEW.company_id,NEW.asset_id,NEW.location_id,'CHECK-'||NEW.id,'Open','Normal',NEW.result||': '||coalesce(NEW.source_data->>'remark',''),NEW.author_name,
   jsonb_build_object('Checklist ID',NEW.id,'Actor ID',public.current_staff_id(),'Created Date',now()),public.current_staff_id())
  ON CONFLICT(company_id,source_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.report_asset_maintenance_v2(p_asset uuid,p_location uuid,p_description text,p_priority text,p_client_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 existing public.asset_maintenance; progress public.asset_maintenance_updates; result uuid;
BEGIN
 IF company IS NULL OR actor IS NULL OR NOT (public.has_permission('assets.report') OR
   (public.asset_management_role() AND public.has_permission('assets.maintenance'))) OR NOT public.asset_location_access(p_location) THEN
  RAISE EXCEPTION 'Maintenance permission denied'; END IF;
 IF p_asset IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.asset_holdings WHERE company_id=company AND asset_id=p_asset
   AND location_id=p_location AND (quantity IS NULL OR quantity>0)) THEN RAISE EXCEPTION 'Asset not held at this location'; END IF;
 IF length(trim(coalesce(p_description,''))) NOT BETWEEN 1 AND 4000 OR p_priority IS NULL OR p_priority NOT IN ('Low','Normal','High','Urgent')
   OR p_client_key IS NULL THEN RAISE EXCEPTION 'Invalid maintenance details'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(company::text||'/maintenance/'||p_client_key::text,0));
 IF p_asset IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(company::text||'/open-asset-repair/'||p_asset::text,0)); END IF;
 SELECT * INTO existing FROM public.asset_maintenance WHERE company_id=company AND source_id='OMS-'||p_client_key;
 IF FOUND THEN
  IF existing.reported_by IS DISTINCT FROM actor OR existing.asset_id IS DISTINCT FROM p_asset OR existing.location_id IS DISTINCT FROM p_location
   OR existing.description IS DISTINCT FROM trim(p_description) OR existing.priority IS DISTINCT FROM p_priority THEN
   RAISE EXCEPTION 'Maintenance key was reused with different details'; END IF;
  RETURN existing.id;
 END IF;
 SELECT * INTO progress FROM public.asset_maintenance_updates WHERE company_id=company AND source_id='OMS-PROGRESS-'||p_client_key;
 IF FOUND THEN
  IF progress.source_data->>'Actor ID' IS DISTINCT FROM actor::text OR progress.source_data->>'Requested asset' IS DISTINCT FROM p_asset::text
   OR progress.source_data->>'Requested location' IS DISTINCT FROM p_location::text OR progress.source_data->>'Comment' IS DISTINCT FROM trim(p_description)
   OR progress.source_data->>'Requested priority' IS DISTINCT FROM p_priority THEN RAISE EXCEPTION 'Maintenance key was reused with different details'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.asset_maintenance WHERE id=progress.maintenance_id AND company_id=company AND public.asset_location_access(location_id)) THEN
   RAISE EXCEPTION 'Maintenance permission denied'; END IF;
  RETURN progress.maintenance_id;
 END IF;
 IF p_asset IS NOT NULL THEN
  SELECT * INTO existing FROM public.asset_maintenance WHERE company_id=company AND asset_id=p_asset
   AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF FOUND THEN
   IF NOT public.asset_location_access(existing.location_id) THEN RAISE EXCEPTION 'This asset has an unresolved repair. Ask an asset manager to add the issue.'; END IF;
   INSERT INTO public.asset_maintenance_updates(company_id,maintenance_id,source_id,author_name,source_data)
   VALUES(company,existing.id,'OMS-PROGRESS-'||p_client_key,coalesce((SELECT full_name FROM public.staffs WHERE id=actor),'Staff'),jsonb_build_object(
    'Update Type','Additional issue','Requested asset',p_asset,'Requested location',p_location,'Comment',trim(p_description),
    'Requested priority',p_priority,'Actor ID',actor,'Status Before',existing.status,'Status After',existing.status,'Update Date',now()));
   RETURN existing.id;
  END IF;
 END IF;
 INSERT INTO public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
 VALUES(company,p_asset,p_location,'OMS-'||p_client_key,'Open',p_priority,trim(p_description),coalesce((SELECT full_name FROM public.staffs WHERE id=actor),'Staff'),
  jsonb_build_object('Actor ID',actor,'Created Date',now()),actor) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.report_asset_maintenance_v2(uuid,uuid,text,text,uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.report_asset_maintenance_v2(uuid,uuid,text,text,uuid) TO authenticated;

CREATE FUNCTION public.get_asset_check_open_repairs_v2(p_location uuid,p_assets uuid[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE company uuid:=public.current_staff_company_id(); asset uuid; existing public.asset_maintenance; result jsonb:='[]'; visible_count bigint;
BEGIN
 IF company IS NULL OR NOT public.has_permission('assets.check') OR NOT public.asset_location_access(p_location) THEN RAISE EXCEPTION 'Checklist permission denied'; END IF;
 IF p_assets IS NULL OR cardinality(p_assets)>5000 OR EXISTS(SELECT 1 FROM unnest(p_assets) a WHERE NOT EXISTS(
  SELECT 1 FROM public.asset_holdings WHERE company_id=company AND asset_id=a AND location_id=p_location)) THEN RAISE EXCEPTION 'Checklist assets outside assigned holding'; END IF;
 FOR asset IN SELECT DISTINCT unnest(p_assets) LOOP
  SELECT * INTO existing FROM public.asset_maintenance WHERE company_id=company AND asset_id=asset
   AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled') AND public.asset_location_access(location_id)
   ORDER BY created_at DESC,id DESC LIMIT 1;
  IF FOUND THEN
   SELECT count(*) INTO visible_count FROM public.asset_maintenance WHERE company_id=company AND asset_id=asset
    AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled') AND public.asset_location_access(location_id);
   result:=result||jsonb_build_array(jsonb_build_object('asset_id',asset,'id',existing.id,'status',existing.status,'description',existing.description,'open_count',visible_count,'restricted',false));
  ELSIF EXISTS(SELECT 1 FROM public.asset_maintenance WHERE company_id=company AND asset_id=asset AND lower(coalesce(status,'')) NOT IN ('closed','resolved','cancelled')) THEN
   -- Only an attention flag for a held asset crosses locations. No ticket ID,
   -- description, count, actor or actual workflow status from a restricted site.
   result:=result||jsonb_build_array(jsonb_build_object('asset_id',asset,'id',null,'status','Open','description',null,'open_count',null,'restricted',true));
  END IF;
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_asset_check_open_repairs_v2(uuid,uuid[]) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.get_asset_check_open_repairs_v2(uuid,uuid[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
-- Activation: verify every creation/reopen path and exact live trigger signatures.
-- Do not replace existing submit/check authorization, dates, holdings or ACLs.
-- Recovery: stop writers; restore captured trigger/functions/ACLs. Keep all appended
-- rows. After v2-created progress exists, schema rollback must preserve that history.
