begin;
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000003','student-a@example.invalid'),
('10000000-0000-4000-8000-000000000004','student-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003"}',true);
insert into public.applications(id,company,job_title,role_type,tech_stack,application_deadline,assessment_status,portfolio_url,prep_notes)
values ('20000000-0000-4000-8000-000000000003','Student company','Frontend intern','Internship',array['React','C#','.NET'],'2026-11-01','Preparing','https://github.com/example/project','Revise arrays');
do $$ begin
  if not exists(select 1 from public.applications where tech_stack @> array['C#'] and role_type='Internship') then raise exception 'Student fields did not persist'; end if;
  begin
    update public.applications set tech_stack=array['React','react'];
    raise exception 'Duplicate technologies accepted';
  exception when check_violation then null; end;
  begin
    update public.applications set tech_stack=array[null::text];
    raise exception 'Null technology accepted';
  exception when check_violation then null; end;
  begin
    update public.applications set assessment_url='javascript:alert(1)';
    raise exception 'Unsafe assessment URL accepted';
  exception when check_violation then null; end;
  begin
    update public.applications set role_type='Unknown';
    raise exception 'Invalid role type accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004"}',true);
do $$ declare affected integer; begin
  if exists(select 1 from public.applications where id='20000000-0000-4000-8000-000000000003') then raise exception 'Student fields leaked across accounts'; end if;
  update public.applications set prep_notes='Forbidden' where id='20000000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user preparation edit allowed'; end if;
end $$;
rollback;
