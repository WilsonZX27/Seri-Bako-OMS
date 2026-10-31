-- REVIEW ONLY: install requires explicit approval. No migration number assigned.
-- Supplements visible transfer documents; does not change table RLS or action ACLs.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_asset_transfer_display(p_ids uuid[])
RETURNS TABLE(transfer_id uuid, from_name text, to_name text, author_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
 IF cardinality(p_ids) IS NULL OR cardinality(p_ids) > 50 THEN
   RAISE EXCEPTION 'Choose at most 50 transfers.';
 END IF;
 IF public.current_staff_id() IS NULL
    OR public.has_permission('assets.view') IS NOT TRUE
    OR public.current_staff_has_company_role(ARRAY['super_admin','manager','chef','outlet_supervisor']) IS NOT TRUE THEN
   RETURN;
 END IF;
 RETURN QUERY
 WITH documents AS (
   SELECT b.id,b.company_id,b.from_location_id,b.to_location_id,b.requested_by,NULL::text AS recorded_author
   FROM public.asset_transfer_batches b WHERE b.id=ANY(p_ids)
   UNION ALL
   SELECT t.id,t.company_id,t.from_location_id,t.to_location_id,t.requested_by,t.author_name
   FROM public.asset_transfers t WHERE t.id=ANY(p_ids) AND t.batch_id IS NULL
 )
 SELECT d.id,coalesce(fb.branch_name,f.source_name),coalesce(tb.branch_name,t.source_name),
   coalesce(nullif(nullif(d.recorded_author,''),'OMS staff'),s.full_name,'Unrecorded author')
 FROM documents d
 JOIN public.asset_locations f ON f.id=d.from_location_id AND f.company_id=d.company_id
 JOIN public.asset_locations t ON t.id=d.to_location_id AND t.company_id=d.company_id
 LEFT JOIN public.branches fb ON fb.id=f.branch_id AND fb.company_id=d.company_id
 LEFT JOIN public.branches tb ON tb.id=t.branch_id AND tb.company_id=d.company_id
 LEFT JOIN public.staffs s ON s.id=d.requested_by AND s.company_id=d.company_id
 WHERE d.company_id=public.current_staff_company_id()
 AND public.asset_company_live(d.company_id) IS TRUE
 AND (public.asset_location_access(d.from_location_id) IS TRUE OR public.asset_location_access(d.to_location_id) IS TRUE);
END
$function$;
REVOKE ALL ON FUNCTION public.get_asset_transfer_display(uuid[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_asset_transfer_display(uuid[]) TO authenticated;
COMMIT;
