-- Local development seed only. Identity must have been synced by a verified API request.
\set ON_ERROR_STOP on
\getenv owner_email DB_SEED_OWNER_EMAIL
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$ begin
  if to_regclass('auth.users') is not null or to_regnamespace('supabase_migrations') is not null then
    raise exception 'Refusing to change a Supabase database';
  end if;
  if current_setting('jago.environment',true) is distinct from 'development'
    or current_database() !~ '^(jago_nyetir_dev|school_reset_test|school_test)' then
    raise exception 'Seed requires a dedicated local development database';
  end if;
  if not exists(select 1 from app_private.instance where environment='development') then
    raise exception 'Seed forbidden outside a development database';
  end if;
end $$;
select set_config('seed.owner_email',:'owner_email',true) as owner_value \gset

do $$
declare owner_id uuid; owner_count integer; school_id uuid; member_role text; school_name text; ready boolean;
begin
  if nullif(btrim(current_setting('seed.owner_email')),'') is null then
    raise exception 'TEST_ACC_EMAIL required' using errcode='22023';
  end if;
  select count(*),min(id::text)::uuid into owner_count,owner_id from app_private.users
  where lower(email)=lower(btrim(current_setting('seed.owner_email'))) and email_confirmed_at is not null;
  if owner_count<>1 then
    raise exception 'Exactly one verified local identity must match TEST_ACC_EMAIL; log in and call the local API first' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('demo-seed:'||owner_id::text,0));
  select m.school_id,m.role,s.name,s.setup_complete into school_id,member_role,school_name,ready
  from public.school_memberships m join public.schools s on s.id=m.school_id where m.user_id=owner_id;
  if school_id is not null then
    if member_role<>'owner' or school_name<>'Sekolah Demo Jago Nyetir' then
      raise exception 'Account already belongs to a school; refusing to seed unrelated data or promote staff' using errcode='23514';
    end if;
    if not ready then
      raise exception 'Complete existing demo school Settings before seeding' using errcode='55000';
    end if;
  else
    perform set_config('app.user_id',owner_id::text,true);
    school_id := public.create_school('Sekolah Demo Jago Nyetir','Jl. Contoh No. 10, Samarinda',
      false,'08:00','17:00',false,'09:00','12:00');
  end if;
  insert into public.instructors(school_id,id,name,transmission,notes) values
    (school_id,'00000000-0000-0000-0000-000000000301','Instruktur Contoh A','Matic','Data simulasi'),
    (school_id,'00000000-0000-0000-0000-000000000302','Instruktur Contoh B','Manual','Data simulasi')
    on conflict on constraint instructors_pkey do nothing;
  insert into public.vehicles(school_id,id,name,transmission) values
    (school_id,'00000000-0000-0000-0000-000000000401','Mobil Matic Contoh','Matic'),
    (school_id,'00000000-0000-0000-0000-000000000402','Mobil Manual Contoh','Manual')
    on conflict on constraint vehicles_pkey do nothing;
  raise notice 'Demo school ready: %',school_id;
end $$;
commit;
