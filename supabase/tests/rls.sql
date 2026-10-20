-- Run as postgres in the Supabase SQL Editor after the migration.
-- All fixture data and test users are rolled back. Any failed assertion aborts.
begin;
insert into auth.users(id, email) values
('10000000-0000-4000-8000-000000000001','rls-a@example.invalid'),
('10000000-0000-4000-8000-000000000002','rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.applications(id,company,job_title) values ('20000000-0000-4000-8000-000000000001','A company','Engineer');
update public.applications set status='Applied',applied_on='2026-10-20' where id='20000000-0000-4000-8000-000000000001';
update public.applications set notes='No status change' where id='20000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from public.application_status_history where application_id='20000000-0000-4000-8000-000000000001') <> 2 then raise exception 'History trigger failed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.applications(id,company,job_title) values ('20000000-0000-4000-8000-000000000002','B company','Designer');
do $$ declare affected integer; begin
  if exists (select 1 from public.applications where id='20000000-0000-4000-8000-000000000001') then raise exception 'Cross-user read allowed'; end if;
  if exists (select 1 from public.application_status_history where application_id='20000000-0000-4000-8000-000000000001') then raise exception 'Cross-user history read allowed'; end if;
  update public.applications set company='Forbidden' where id='20000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update allowed'; end if;
  delete from public.applications where id='20000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user delete allowed'; end if;
  begin
    insert into public.applications(user_id,company,job_title) values ('10000000-0000-4000-8000-000000000001','Forbidden','Engineer');
    raise exception 'Owner spoofing allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.applications set user_id='10000000-0000-4000-8000-000000000001' where id='20000000-0000-4000-8000-000000000002';
    raise exception 'Ownership transfer allowed';
  exception when raise_exception then
    if SQLERRM <> 'Application ownership and identity cannot change' then raise; end if;
  end;
  begin
    insert into public.application_status_history(application_id,new_status) values ('20000000-0000-4000-8000-000000000002','Offer');
    raise exception 'History mutation allowed';
  exception when insufficient_privilege then null; end;
end $$;
delete from public.applications where id='20000000-0000-4000-8000-000000000002';
reset role;
do $$ begin
  if exists (select 1 from public.application_status_history where application_id='20000000-0000-4000-8000-000000000002') then raise exception 'History cascade failed'; end if;
  if (select company from public.applications where id='20000000-0000-4000-8000-000000000001') <> 'A company' then raise exception 'Original data changed'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform * from public.applications;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
-- Successful completion means all assertions passed; no fixtures remain.
