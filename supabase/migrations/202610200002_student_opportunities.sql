begin;

-- Keep existing applications and ownership policies; all new fields are optional.
create function public.valid_tech_stack(tags text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(tags) <= 20
    and (cardinality(tags) = 0 or array_ndims(tags) = 1)
    and not exists (
      select 1 from unnest(tags) tag
      where tag is null or length(btrim(tag)) not between 1 and 50 or tag <> btrim(tag)
    )
    and (select count(distinct lower(tag)) from unnest(tags) tag) = cardinality(tags);
$$;

alter table public.applications
  add column role_type text not null default 'Unspecified'
    check (role_type in ('Unspecified', 'Internship', 'Graduate', 'Junior', 'Part-time', 'Full-time', 'Contract')),
  add column tech_stack text[] not null default '{}'
    check (public.valid_tech_stack(tech_stack)),
  add column application_deadline date,
  add column assessment_status text not null default 'Not started'
    check (assessment_status in ('Not started', 'Preparing', 'Scheduled', 'Submitted', 'Passed', 'Not passed')),
  add column assessment_url text not null default ''
    check (length(assessment_url) <= 2000 and (assessment_url = '' or assessment_url ~* '^https?://[^[:space:]]+$')),
  add column portfolio_url text not null default ''
    check (length(portfolio_url) <= 2000 and (portfolio_url = '' or portfolio_url ~* '^https?://[^[:space:]]+$')),
  add column prep_notes text not null default '' check (length(prep_notes) <= 10000);

create index applications_tech_stack on public.applications using gin(tech_stack);
create index applications_user_role on public.applications(user_id, role_type);
create index applications_user_deadline on public.applications(user_id, application_deadline) where status = 'Saved';
notify pgrst, 'reload schema';
commit;
