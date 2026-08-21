-- Natural Item Code ordering for the bounded Items workspace.
-- Numeric runs are padded by magnitude and value so 1, 2, 10 sorts as an
-- operator expects, while mixed AutoCount codes keep a deterministic order.

create or replace function public.natural_sort_key(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(string_agg(
    case
      when match[1] ~ '^[0-9]+$'
        then '0' || lpad(length(trim(leading '0' from match[1]))::text, 8, '0') || lpad(trim(leading '0' from match[1]), 64, '0')
      else '1' || lower(match[1])
    end,
    chr(1) order by ordinality
  ), '')
  from regexp_matches(coalesce(p_value, ''), '([0-9]+|[^0-9]+)', 'g') with ordinality as parts(match, ordinality);
$$;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.get_items_workspace(text,text,text,uuid,text,text,text,text,integer,integer)'::regprocedure);
  if position('then item_code end' in definition) = 0 then
    raise exception 'get_items_workspace item-code sort shape changed; natural-sort patch is unsafe';
  end if;

  definition := replace(definition, 'then item_code end', 'then public.natural_sort_key(item_code) end');

  if position('public.natural_sort_key(item_code)' in definition) = 0 then
    raise exception 'get_items_workspace natural-sort patch did not apply';
  end if;
  execute definition;
end $$;

comment on function public.natural_sort_key(text)
is 'Stable natural ordering key for operator-facing codes containing numeric runs.';
