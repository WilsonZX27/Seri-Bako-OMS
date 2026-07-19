# v7.23.5.3 Jack and Ashley Role Correction Plan

Status: guarded local-only plan based on the completed Production read-only audit. No Production mutation was performed.

## Verified Production records

Project ref: `nnvdsaftiwpqkekjfrgc`

The 2026-07-19 read-only audit returned exactly one active, non-deleted match for each authorized identity:

| Staff | Staff ID | Email | Current role | Intended role | Primary branch link |
|---|---|---|---|---|---|
| JACK | `f15f6a97-b850-46ac-bd4d-14403f3c56a0` | `jack@seribako.com.my` | Purchasing | Finance | `NULL` |
| ASHLEY | `a41a153b-27bc-4da0-94dd-8fa2a0bbedde` | `ashley@seribako.com.my` | Purchasing | Finance | `NULL` |

Verified company ID: `3b104582-f8cb-4a4d-867f-b99e5ffc6486`.

## Guarded future correction

Run only after a fresh read-only pre-check and explicit Production mutation approval. Keep `ROLLBACK` for the first controlled dry run. The block fails if either identity, current role link, branch scope, or target Finance role differs from the audit.

```sql
begin;

do $guarded_staff_role_correction$
declare
  v_company_id constant uuid := '3b104582-f8cb-4a4d-867f-b99e5ffc6486';
  v_finance_role_id uuid;
  v_changed integer;
begin
  select id into strict v_finance_role_id
  from public.roles
  where company_id = v_company_id
    and role_code = 'finance'
    and status = 'active'
    and deleted_at is null;

  if (select count(*) from public.staffs where company_id = v_company_id and id = 'f15f6a97-b850-46ac-bd4d-14403f3c56a0' and lower(email) = 'jack@seribako.com.my' and upper(staff_code) = 'JACK' and status = 'active' and deleted_at is null) <> 1 then
    raise exception 'JACK identity pre-check failed';
  end if;
  if (select count(*) from public.staffs where company_id = v_company_id and id = 'a41a153b-27bc-4da0-94dd-8fa2a0bbedde' and lower(email) = 'ashley@seribako.com.my' and upper(staff_code) = 'ASHLEY' and status = 'active' and deleted_at is null) <> 1 then
    raise exception 'ASHLEY identity pre-check failed';
  end if;
  if (select count(*) from public.staff_roles sr join public.roles r on r.id = sr.role_id where sr.staff_id in ('f15f6a97-b850-46ac-bd4d-14403f3c56a0', 'a41a153b-27bc-4da0-94dd-8fa2a0bbedde') and sr.is_primary and sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date) and sr.branch_id is null and r.role_code = 'purchasing' and r.status = 'active' and r.deleted_at is null) <> 2 then
    raise exception 'Expected current Purchasing role links were not found';
  end if;

  update public.staff_roles
  set role_id = v_finance_role_id
  where staff_id in ('f15f6a97-b850-46ac-bd4d-14403f3c56a0', 'a41a153b-27bc-4da0-94dd-8fa2a0bbedde')
    and is_primary
    and effective_from <= current_date
    and (effective_to is null or effective_to >= current_date)
    and branch_id is null;
  get diagnostics v_changed = row_count;
  if v_changed <> 2 then
    raise exception 'Expected two role links to change, changed %', v_changed;
  end if;
end
$guarded_staff_role_correction$;

select s.id, s.staff_code, s.email, r.role_code, sr.is_primary, sr.branch_id
from public.staffs s
join public.staff_roles sr on sr.staff_id = s.id and sr.is_primary
  and sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)
join public.roles r on r.id = sr.role_id
where s.id in ('f15f6a97-b850-46ac-bd4d-14403f3c56a0', 'a41a153b-27bc-4da0-94dd-8fa2a0bbedde')
order by s.staff_code;

rollback;
```

Future execution may replace only the final `ROLLBACK` with `COMMIT` after the dry-run post-check returns exactly JACK and ASHLEY as Finance with unchanged `branch_id IS NULL`.
