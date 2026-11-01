-- LOCAL PROPOSAL ONLY. Not installed; recheck 378 against production and pending proposals before approval.
BEGIN;
ALTER TABLE public.asset_locations ADD COLUMN other_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.asset_locations ADD COLUMN settings_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.asset_locations ADD CONSTRAINT asset_location_other_state CHECK(kind='other' OR other_active);
CREATE FUNCTION public.update_asset_other_location(p_id uuid,p_name text,p_active boolean,p_revision bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); loc public.asset_locations; label text:=trim(p_name); next_revision bigint;
BEGIN
 IF actor IS NULL OR public.current_staff_has_company_role(ARRAY['super_admin','manager','finance','purchasing']) IS NOT TRUE OR public.has_permission('assets.view') IS NOT TRUE OR public.asset_company_live(company) IS NOT TRUE THEN RAISE EXCEPTION 'Your role cannot manage asset destinations'; END IF;
 IF label IS NULL OR length(label) NOT BETWEEN 2 AND 120 OR p_active IS NULL OR p_revision IS NULL THEN RAISE EXCEPTION 'Enter a name between 2 and 120 characters and a valid status'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(company::text||':asset-location:'||lower(label),0));
 SELECT * INTO loc FROM public.asset_locations WHERE id=p_id AND company_id=company AND kind='other' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Destination unavailable'; END IF;
 IF loc.settings_revision<>p_revision THEN RAISE EXCEPTION 'This destination changed. Reload before saving'; END IF;
 IF EXISTS(SELECT 1 FROM public.asset_locations WHERE company_id=company AND id<>p_id AND lower(source_name)=lower(label)) THEN RAISE EXCEPTION 'This location name is already in use'; END IF;
 IF NOT p_active AND loc.other_active THEN
  IF EXISTS(SELECT 1 FROM public.asset_holdings WHERE company_id=company AND location_id=p_id AND (quantity IS NULL OR quantity>0)) THEN RAISE EXCEPTION 'Move or confirm remaining assets before deactivating this destination'; END IF;
  IF EXISTS(SELECT 1 FROM public.asset_transfers WHERE company_id=company AND (from_location_id=p_id OR to_location_id=p_id) AND status IN ('requested','approved','dispatched')) OR EXISTS(SELECT 1 FROM public.asset_transfer_batches WHERE company_id=company AND (from_location_id=p_id OR to_location_id=p_id) AND status IN ('requested','approved','dispatched')) THEN RAISE EXCEPTION 'Complete or reject in-progress transfers before deactivating this destination'; END IF;
 END IF;
 IF loc.source_name=label AND loc.other_active=p_active THEN RETURN loc.settings_revision; END IF;
 UPDATE public.asset_locations SET source_name=label,other_active=p_active,settings_revision=settings_revision+1 WHERE id=p_id AND company_id=company RETURNING settings_revision INTO next_revision;
 INSERT INTO public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) VALUES(company,'asset_location',p_id,'updated','Asset destination settings updated',jsonb_build_object('name_before',loc.source_name,'name_after',label,'active_before',loc.other_active,'active_after',p_active,'revision',next_revision),actor);
 RETURN next_revision;
END $$;
REVOKE ALL ON FUNCTION public.update_asset_other_location(uuid,text,boolean,bigint) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.update_asset_other_location(uuid,text,boolean,bigint) TO authenticated;

-- Narrow Settings metadata only; no change to location/holding/history RLS.
CREATE FUNCTION public.get_asset_other_location_settings(p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE company uuid:=public.current_staff_company_id(); result jsonb;
BEGIN
 IF public.current_staff_id() IS NULL OR public.current_staff_has_company_role(ARRAY['super_admin','manager','finance','purchasing']) IS NOT TRUE OR public.has_permission('assets.view') IS NOT TRUE OR public.asset_company_live(company) IS NOT TRUE THEN RAISE EXCEPTION 'Your role cannot manage asset destinations'; END IF;
 SELECT jsonb_build_object('total',(SELECT count(*) FROM public.asset_locations WHERE company_id=company AND kind='other'),'rows',coalesce(jsonb_agg(r),'[]'::jsonb)) INTO result FROM (SELECT id,source_name,other_active,settings_revision FROM public.asset_locations WHERE company_id=company AND kind='other' ORDER BY source_name,id LIMIT 50 OFFSET (greatest(1,least(10000,coalesce(p_page,1)))-1)*50) r;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_asset_other_location_settings(integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_asset_other_location_settings(integer) TO authenticated;

-- Shared row locks serialize activation changes with incoming holdings and both transfer representations.
CREATE FUNCTION public.guard_asset_destination_active() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE loc public.asset_locations; ids uuid[];
BEGIN
 IF TG_TABLE_NAME='asset_holdings' THEN
  IF NEW.quantity IS NOT NULL AND NEW.quantity<=0 THEN RETURN NEW; END IF;
  ids:=ARRAY[NEW.location_id];
 ELSE
  IF NEW.status NOT IN ('requested','approved','dispatched') THEN RETURN NEW; END IF;
  ids:=ARRAY[NEW.from_location_id,NEW.to_location_id];
 END IF;
 FOR loc IN SELECT * FROM public.asset_locations WHERE company_id=NEW.company_id AND id=ANY(ids) ORDER BY id FOR UPDATE LOOP
  IF loc.kind='other' AND NOT loc.other_active THEN RAISE EXCEPTION 'Destination is inactive. Choose an active location'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_asset_destination_active() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER asset_holdings_active_destination BEFORE INSERT OR UPDATE OF location_id,quantity ON public.asset_holdings FOR EACH ROW EXECUTE FUNCTION public.guard_asset_destination_active();
CREATE TRIGGER asset_transfers_active_destination BEFORE INSERT OR UPDATE OF from_location_id,to_location_id,status ON public.asset_transfers FOR EACH ROW EXECUTE FUNCTION public.guard_asset_destination_active();
CREATE TRIGGER asset_batches_active_destination BEFORE INSERT OR UPDATE OF from_location_id,to_location_id,status ON public.asset_transfer_batches FOR EACH ROW EXECUTE FUNCTION public.guard_asset_destination_active();
NOTIFY pgrst,'reload schema';
COMMIT;
