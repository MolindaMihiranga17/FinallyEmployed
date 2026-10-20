begin;
create type public.application_status as enum ('Saved','Applied','Screening','Interview','Offer','Rejected','Withdrawn');
create type public.work_arrangement as enum ('Remote','Hybrid','On-site','Unspecified');
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null check (length(trim(company)) between 1 and 200),
  job_title text not null check (length(trim(job_title)) between 1 and 200),
  job_url text not null default '' check (length(job_url) <= 2000 and (job_url = '' or job_url ~* '^https?://[^[:space:]]+$')),
  location text not null default '' check (length(location) <= 200),
  work_arrangement public.work_arrangement not null default 'Unspecified',
  applied_on date,
  status public.application_status not null default 'Saved',
  notes text not null default '' check (length(notes) <= 20000),
  next_action text not null default '' check (length(next_action) <= 300),
  next_action_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint application_date_required check (status = 'Saved' or applied_on is not null),
  constraint next_action_required check (next_action_at is null or length(trim(next_action)) > 0)
);
create index applications_user_date on public.applications(user_id, applied_on desc);
create index applications_user_status on public.applications(user_id, status);
create index applications_user_next on public.applications(user_id, next_action_at);
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status public.application_status,
  new_status public.application_status not null,
  changed_at timestamptz not null default now()
);
create index history_application on public.application_status_history(application_id, changed_at desc);
create function public.prepare_application_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
    raise exception 'Application ownership and identity cannot change';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end; $$;
create trigger prepare_application_update before update on public.applications for each row execute function public.prepare_application_update();
create function public.record_application_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.application_status_history(application_id,new_status) values (new.id,new.status);
  elsif new.status is distinct from old.status then
    insert into public.application_status_history(application_id,old_status,new_status) values (new.id,old.status,new.status);
  end if;
  return new;
end; $$;
create trigger record_application_status after insert or update on public.applications for each row execute function public.record_application_status();
revoke all on function public.record_application_status() from public, anon, authenticated;
revoke all on function public.prepare_application_update() from public, anon, authenticated;
alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
revoke all on public.applications, public.application_status_history from anon, authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select on public.application_status_history to authenticated;
create policy applications_select on public.applications for select to authenticated using ((select auth.uid()) = user_id);
create policy applications_insert on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy applications_update on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy applications_delete on public.applications for delete to authenticated using ((select auth.uid()) = user_id);
create policy history_select on public.application_status_history for select to authenticated using (exists (select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.uid())));
commit;
