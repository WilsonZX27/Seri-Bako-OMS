-- Retire client access to superseded compatibility RPCs and harden the
-- audit-only reservation artifact. Current application workflows do not call
-- any of these functions or write to the holds table.

do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'cancel_goods_receiving_atomic_legacy(uuid)',
    'cancel_purchase_return_atomic_legacy(uuid)',
    'transition_production_job_atomic_legacy(uuid,text,text)',
    'transition_stock_transfer_terminal_atomic_legacy(uuid,text)',
    'transition_stock_wastage_terminal_atomic_legacy(uuid,text)',
    'preview_phase_one_hard_delete_v057(text,uuid)',
    'hard_delete_phase_one_v057(text,uuid,text)',
    'preview_phase_one_hard_delete_v058(text,uuid)',
    'hard_delete_phase_one_v058(text,uuid,text)',
    'preview_phase_one_hard_delete_v059(text,uuid)',
    'hard_delete_phase_one_v059(text,uuid,text)'
  ] loop
    if to_regprocedure('public.' || function_signature) is not null then
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        function_signature
      );
    end if;
  end loop;
end;
$$;

alter table public.purchase_request_stock_holds enable row level security;

comment on table public.purchase_request_stock_holds is
  'Deprecated audit-only artifact from migration 111. RLS is enabled and no client role has table or RPC access.';
