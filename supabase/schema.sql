begin;
create schema if not exists experiment_private;
revoke all on schema experiment_private from public, anon, authenticated;

create table if not exists experiment_private.responses (
  id uuid primary key,
  school text not null,
  student_number text not null,
  student_name text not null,
  elapsed_ms integer not null check (elapsed_ms between 1 and 180000),
  saved_at timestamptz not null default now()
);
alter table experiment_private.responses enable row level security;

create table if not exists experiment_private.admin_key (
  singleton boolean primary key default true check (singleton),
  key_hash text not null
);
alter table experiment_private.admin_key enable row level security;

create or replace function public.submit_time_result(
  response_id uuid, school_name text, student_id text, full_name text,
  duration_ms integer, consent boolean
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  stored_ms integer;
  measured numeric;
begin
  if response_id is null or consent is distinct from true
     or duration_ms is null or duration_ms not between 1 and 180000
     or school_name is null or char_length(btrim(school_name)) not between 1 and 60
     or student_id is null or btrim(student_id) !~ '^[0-9]{1,20}$'
     or full_name is null or char_length(btrim(full_name)) not between 1 and 40
     or school_name ~ '[[:cntrl:]]' or full_name ~ '[[:cntrl:]]' then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;

  insert into experiment_private.responses (id, school, student_number, student_name, elapsed_ms)
  values (response_id, btrim(school_name), btrim(student_id), btrim(full_name), duration_ms)
  on conflict (id) do nothing;

  select elapsed_ms into stored_ms from experiment_private.responses
  where id = response_id and school = btrim(school_name)
    and student_number = btrim(student_id) and student_name = btrim(full_name)
    and elapsed_ms = duration_ms;
  if stored_ms is null then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;

  measured := round(stored_ms / 1000.0, 2);
  return jsonb_build_object('ok', true, 'measuredSeconds', measured,
    'errorSeconds', measured - 20, 'winner', measured = 20);
end;
$$;

create or replace function public.list_time_results(access_key text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if access_key is null or access_key !~ '^[a-f0-9]{64}$'
     or not exists (
       select 1 from experiment_private.admin_key
       where key_hash = encode(sha256(convert_to(access_key, 'UTF8')), 'hex')
     ) then
    raise sqlstate 'PT403' using message = 'invalid_admin_key';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.saved_at desc, r.id), '[]'::jsonb)
          from experiment_private.responses as r);
end;
$$;

revoke all on function public.submit_time_result(uuid,text,text,text,integer,boolean) from public, anon, authenticated;
revoke all on function public.list_time_results(text) from public, anon, authenticated;
grant execute on function public.submit_time_result(uuid,text,text,text,integer,boolean) to anon;
grant execute on function public.list_time_results(text) to anon;
commit;
