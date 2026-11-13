-- Run in a Supabase Postgres project. Supabase Auth owns users.
create extension if not exists pgcrypto;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  location text,
  weekday_closed boolean,
  weekday_open time,
  weekday_close time,
  weekend_closed boolean,
  weekend_open time,
  weekend_close time,
  setup_complete boolean generated always as (
    coalesce(name ~ '[^[:space:]]' and location ~ '[^[:space:]]'
      and weekday_closed is not null and weekend_closed is not null,false)
  ) stored,
  constraint school_weekday_hours check (
    (weekday_closed is null and weekday_open is null and weekday_close is null)
    or (weekday_closed is true and weekday_open is null and weekday_close is null)
    or (weekday_closed is false and weekday_open is not null and weekday_close is not null
      and weekday_open<weekday_close and weekday_close<time '24:00')
  ),
  constraint school_weekend_hours check (
    (weekend_closed is null and weekend_open is null and weekend_close is null)
    or (weekend_closed is true and weekend_open is null and weekend_close is null)
    or (weekend_closed is false and weekend_open is not null and weekend_close is not null
      and weekend_open<weekend_close and weekend_close<time '24:00')
  ),
  constraint school_open_period check (weekday_closed is not true or weekend_closed is not true),
  created_at timestamptz not null default now()
);
create table public.school_memberships (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  unique(user_id),
  primary key (school_id,user_id)
);

create function public.is_school_member(target_school uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from school_memberships where school_id=target_school and user_id=auth.uid()) $$;

create function public.can_use_school(target_school uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_school_member(target_school)
    and exists(select 1 from public.schools where id=target_school and setup_complete)
$$;

create function public.require_school_setup(target_school uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_school_member(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if not public.can_use_school(target_school) then raise exception 'School setup required' using errcode='55000'; end if;
end $$;

-- The user constraint rolls back both inserts if an account already belongs to a school.
create function public.create_school(
  p_name text,p_location text,p_weekday_closed boolean,p_weekday_open time,p_weekday_close time,
  p_weekend_closed boolean,p_weekend_open time,p_weekend_close time
)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode='42501'; end if;
  if p_name is null or p_name !~ '[^[:space:]]' or p_location is null or p_location !~ '[^[:space:]]'
    or p_weekday_closed is null or p_weekend_closed is null then
    raise exception 'School name, address and operating hours required' using errcode='22023';
  end if;
  insert into public.schools(name,location,weekday_closed,weekday_open,weekday_close,weekend_closed,weekend_open,weekend_close)
  values(btrim(p_name),btrim(p_location),p_weekday_closed,p_weekday_open,p_weekday_close,p_weekend_closed,p_weekend_open,p_weekend_close)
  returning id into new_id;
  insert into public.school_memberships(school_id,user_id,role) values(new_id,auth.uid(),'owner');
  return new_id;
end $$;
revoke all on function public.create_school(text,text,boolean,time,time,boolean,time,time) from public;
grant execute on function public.create_school(text,text,boolean,time,time,boolean,time,time) to authenticated;

-- Legacy direct-add flow; invitation acceptance is a separate, unimplemented workflow.
create function public.add_school_staff(p_school_id uuid,p_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare staff_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text,0));
  perform public.require_school_setup(p_school_id);
  if not exists(select 1 from public.school_memberships where school_id=p_school_id and user_id=auth.uid() and role='owner') then
    raise exception 'School owner required' using errcode='42501';
  end if;
  select id into staff_id from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null;
  if staff_id is null then raise exception 'Confirmed staff account not found' using errcode='P0002'; end if;
  insert into public.school_memberships(school_id,user_id,role) values(p_school_id,staff_id,'staff')
  on conflict(school_id,user_id) do nothing;
  return staff_id;
end $$;
revoke all on function public.add_school_staff(uuid,text) from public;
grant execute on function public.add_school_staff(uuid,text) to authenticated;

create table public.requests (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  name text not null, phone text, interest text, preferred_time text,
  status text not null default 'Baru', source text, notes text,
  created_at timestamptz not null default now(), primary key(school_id,id)
);
create table public.students (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  name text not null, phone text,
  status text not null default 'Aktif', created_at timestamptz not null default now(), primary key(school_id,id)
);
create table public.instructors (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  name text not null, transmission text not null check(transmission in ('Matic','Manual','Matic & Manual')),
  active boolean not null default true, notes text, primary key(school_id,id)
);
create table public.vehicles (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  name text not null, transmission text not null check(transmission in ('Matic','Manual')),
  image_url text,
  active boolean not null default true, primary key(school_id,id)
);
create table public.packages (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  name text not null, description text, normal_price numeric(10,2) not null check(normal_price >= 0), discount_price numeric(10,2) check(discount_price >= 0), start_discount date, end_discount date, total_sessions integer not null check(total_sessions>0), active boolean not null default true,
  primary key(school_id,id),
  constraint packages_discount_complete check (
    (discount_price is null and start_discount is null and end_discount is null) or
    (discount_price is not null and start_discount is not null and end_discount is not null)
  ),
  constraint packages_discount_lower check(discount_price < normal_price),
  constraint packages_discount_dates check(end_discount > start_discount)
);
create table public.student_enrollments (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  student_id uuid not null, package_id uuid not null,
  package_name text not null, total_sessions integer not null check(total_sessions>0),
  status text not null default 'Aktif' check(status in ('Aktif','Selesai','Dibatalkan')),
  enrolled_at timestamptz not null default now(), primary key(school_id,id),
  unique(school_id,student_id,id),
  foreign key(school_id,student_id) references public.students(school_id,id),
  foreign key(school_id,package_id) references public.packages(school_id,id)
);
create table public.sessions (
  school_id uuid not null references public.schools(id), id uuid not null default gen_random_uuid(),
  student_id uuid not null, enrollment_id uuid not null, instructor_id uuid not null, vehicle_id uuid not null,
  session_date date not null, start_time time not null, end_time time not null,
  transmission text not null check(transmission in ('Matic','Manual')),
  status text not null default 'Menunggu konfirmasi' check(status in ('Menunggu konfirmasi','Terkonfirmasi','Selesai','Dibatalkan','Tidak hadir')),
  primary key(school_id,id), check(start_time<end_time),
  foreign key(school_id,student_id) references public.students(school_id,id),
  foreign key(school_id,student_id,enrollment_id) references public.student_enrollments(school_id,student_id,id),
  foreign key(school_id,instructor_id) references public.instructors(school_id,id),
  foreign key(school_id,vehicle_id) references public.vehicles(school_id,id)
);

create function public.school_allows_session(school public.schools,p_date date,p_start time,p_end time)
returns boolean language sql immutable set search_path=public as $$
  select coalesce(school.setup_complete and p_start<p_end and
    case when extract(isodow from p_date) between 1 and 5 then
      not school.weekday_closed and p_start>=school.weekday_open and p_end<=school.weekday_close
    else
      not school.weekend_closed and p_start>=school.weekend_open and p_end<=school.weekend_close
    end,false)
$$;

create function public.guard_school_settings() returns trigger
language plpgsql set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,0));
  if not new.setup_complete then
    raise exception 'School name, address and operating hours required' using errcode='22023';
  end if;
  if exists(select 1 from public.sessions s where s.school_id=new.id
    and s.session_date >= (now() at time zone 'Asia/Makassar')::date
    and s.status not in ('Dibatalkan','Selesai','Tidak hadir')
    and not public.school_allows_session(new,s.session_date,s.start_time,s.end_time)) then
    raise exception 'Operating hours conflict with upcoming sessions' using errcode='23514';
  end if;
  return new;
end $$;
-- Generated columns are available only after the row is written.
create trigger school_settings_guard after update of name,location,weekday_closed,weekday_open,weekday_close,
  weekend_closed,weekend_open,weekend_close on public.schools
for each row execute function public.guard_school_settings();

create function public.update_school_settings(
  p_school_id uuid,p_name text,p_location text,p_weekday_closed boolean,p_weekday_open time,p_weekday_close time,
  p_weekend_closed boolean,p_weekend_open time,p_weekend_close time
) returns uuid language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text,0));
  if not exists(select 1 from public.school_memberships where school_id=p_school_id and user_id=auth.uid() and role='owner') then
    raise exception 'School owner required' using errcode='42501';
  end if;
  update public.schools set name=btrim(p_name),location=btrim(p_location),
    weekday_closed=p_weekday_closed,weekday_open=p_weekday_open,weekday_close=p_weekday_close,
    weekend_closed=p_weekend_closed,weekend_open=p_weekend_open,weekend_close=p_weekend_close
  where id=p_school_id;
  return p_school_id;
end $$;
revoke all on function public.update_school_settings(uuid,text,text,boolean,time,time,boolean,time,time) from public;
grant execute on function public.update_school_settings(uuid,text,text,boolean,time,time,boolean,time,time) to authenticated;

create function public.guard_session_hours() returns trigger
language plpgsql set search_path=public as $$
declare school public.schools%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.school_id::text,0));
  if tg_op='UPDATE' and new.status='Dibatalkan' then return new; end if;
  select * into school from public.schools where id=new.school_id;
  if not public.school_allows_session(school,new.session_date,new.start_time,new.end_time) then
    raise exception 'Session must be within school operating hours' using errcode='23514';
  end if;
  return new;
end $$;
create trigger session_hours_guard before insert or update on public.sessions
for each row execute function public.guard_session_hours();

create function public.guard_school_owner() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(old.school_id::text,0));
  if tg_op='UPDATE' then
    if new.school_id<>old.school_id or new.user_id<>old.user_id then
      raise exception 'Membership identity cannot be changed' using errcode='23514';
    end if;
    if new.role='owner' then return new; end if;
  end if;
  if old.role='owner' and exists(select 1 from public.schools where id=old.school_id)
    and not exists(select 1 from public.school_memberships
      where school_id=old.school_id and user_id<>old.user_id and role='owner') then
    raise exception 'Last school owner cannot be removed' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger school_owner_guard before update or delete on public.school_memberships
for each row execute function public.guard_school_owner();

-- Keep future lessons assignable when an instructor is edited.
create function public.guard_instructor_schedule() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.active is distinct from old.active or new.transmission is distinct from old.transmission then
    perform pg_advisory_xact_lock(hashtextextended(new.school_id::text,0));
    if exists (
      select 1 from public.sessions s
      where s.school_id=new.school_id and s.instructor_id=new.id
        and s.session_date >= (now() at time zone 'Asia/Makassar')::date
        and s.status not in ('Dibatalkan','Selesai','Tidak hadir')
        and (not new.active or new.transmission not in (s.transmission,'Matic & Manual'))
    ) then
      raise exception 'Instructor has incompatible upcoming sessions' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger instructor_schedule_guard before update of active, transmission on public.instructors
for each row execute function public.guard_instructor_schedule();

create function public.guard_vehicle_schedule() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.active is distinct from old.active or new.transmission is distinct from old.transmission then
    perform pg_advisory_xact_lock(hashtextextended(new.school_id::text,0));
    if exists (
      select 1 from public.sessions s
      where s.school_id=new.school_id and s.vehicle_id=new.id
        and s.session_date >= (now() at time zone 'Asia/Makassar')::date
        and s.status not in ('Dibatalkan','Selesai','Tidak hadir')
        and (not new.active or new.transmission<>s.transmission)
    ) then
      raise exception 'Vehicle has incompatible upcoming sessions' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger vehicle_schedule_guard before update of active, transmission on public.vehicles
for each row execute function public.guard_vehicle_schedule();

alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
create policy school_read on public.schools for select using (public.is_school_member(id));
create policy membership_read on public.school_memberships for select using (public.is_school_member(school_id));
-- Schools and memberships are changed only through their authorized functions.

do $$ declare table_name text; begin
  foreach table_name in array array['requests','students','instructors','vehicles','packages','student_enrollments','sessions'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy tenant_read on public.%I for select using (public.can_use_school(school_id))',table_name);
    execute format('create policy tenant_insert on public.%I for insert with check (public.can_use_school(school_id))',table_name);
    execute format('create policy tenant_update on public.%I for update using (public.can_use_school(school_id)) with check (public.can_use_school(school_id))',table_name);
  end loop;
end $$;

-- Instructor deletion is permitted only within the caller's school.
create policy instructor_delete on public.instructors for delete using (public.can_use_school(school_id));
create policy vehicle_delete on public.vehicles for delete using (public.can_use_school(school_id));

-- Enrollment allowance is copied from the package by the database, never trusted from the browser.
drop policy tenant_insert on public.student_enrollments;
drop policy tenant_update on public.student_enrollments;
create function public.create_student_enrollment(p_school_id uuid,p_student_id uuid,p_package_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare package_row public.packages%rowtype; new_id uuid;
begin
  perform public.require_school_setup(p_school_id);
  if not exists(select 1 from public.students where school_id=p_school_id and id=p_student_id) then
    raise exception 'Student not found' using errcode='P0002';
  end if;
  select * into package_row from public.packages where school_id=p_school_id and id=p_package_id and active;
  if package_row.id is null then raise exception 'Active package required' using errcode='22023'; end if;
  insert into public.student_enrollments(school_id,student_id,package_id,package_name,total_sessions)
  values(p_school_id,p_student_id,p_package_id,package_row.name,package_row.total_sessions) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.create_student_enrollment(uuid,uuid,uuid) from public;
grant execute on function public.create_student_enrollment(uuid,uuid,uuid) to authenticated;

-- Sessions must be written through the atomic function, never through table REST writes.
drop policy tenant_insert on public.sessions;
drop policy tenant_update on public.sessions;

-- Serialize scheduling changes within a school. Conflicts are checked after the lock.
create function public.save_school_session(
  p_school_id uuid, p_id uuid, p_student_id uuid, p_enrollment_id uuid, p_instructor_id uuid, p_vehicle_id uuid,
  p_date date, p_start time, p_end time, p_transmission text, p_status text
) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid; instructor_row public.instructors%rowtype; vehicle_row public.vehicles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text,0));
  perform public.require_school_setup(p_school_id);
  if p_id is not null and p_status='Dibatalkan' then
    update public.sessions set status='Dibatalkan' where school_id=p_school_id and id=p_id returning id into result_id;
    if result_id is null then raise exception 'Session not found' using errcode='P0002'; end if;
    return result_id;
  end if;
  if p_start >= p_end then raise exception 'End must be after start' using errcode='22023'; end if;
  if not exists(select 1 from public.student_enrollments e where e.school_id=p_school_id and e.id=p_enrollment_id and e.student_id=p_student_id and e.status='Aktif') then
    raise exception 'Active enrollment required' using errcode='22023';
  end if;
  if p_status not in ('Dibatalkan','Tidak hadir') and
    (select count(*) from public.sessions s where s.school_id=p_school_id and s.enrollment_id=p_enrollment_id
      and s.id is distinct from p_id and s.status not in ('Dibatalkan','Tidak hadir')) >=
    (select total_sessions from public.student_enrollments where school_id=p_school_id and id=p_enrollment_id) then
    raise exception 'Package session allowance exhausted' using errcode='23514';
  end if;
  select * into instructor_row from public.instructors where school_id=p_school_id and id=p_instructor_id and active;
  select * into vehicle_row from public.vehicles where school_id=p_school_id and id=p_vehicle_id and active;
  if instructor_row.id is null or vehicle_row.id is null or vehicle_row.transmission<>p_transmission or
    instructor_row.transmission not in (p_transmission,'Matic & Manual') then
    raise exception 'Inactive or incompatible resource' using errcode='22023';
  end if;
  if p_status not in ('Dibatalkan','Tidak hadir') and exists(select 1 from public.sessions s where s.school_id=p_school_id and s.id is distinct from p_id
    and s.session_date=p_date and s.status not in ('Dibatalkan','Tidak hadir')
    and p_start<s.end_time and p_end>s.start_time
    and (s.student_id=p_student_id or s.instructor_id=p_instructor_id or s.vehicle_id=p_vehicle_id)) then
    raise exception 'Schedule conflict' using errcode='23505';
  end if;
  if p_id is null then
    insert into public.sessions(school_id,student_id,enrollment_id,instructor_id,vehicle_id,session_date,start_time,end_time,transmission,status)
    values(p_school_id,p_student_id,p_enrollment_id,p_instructor_id,p_vehicle_id,p_date,p_start,p_end,p_transmission,p_status) returning id into result_id;
  else
    update public.sessions set student_id=p_student_id,enrollment_id=p_enrollment_id,instructor_id=p_instructor_id,vehicle_id=p_vehicle_id,
      session_date=p_date,start_time=p_start,end_time=p_end,transmission=p_transmission,status=p_status
    where school_id=p_school_id and id=p_id returning id into result_id;
    if result_id is null then raise exception 'Session not found' using errcode='P0002'; end if;
  end if;
  return result_id;
end $$;
revoke all on function public.save_school_session(uuid,uuid,uuid,uuid,uuid,uuid,date,time,time,text,text) from public;
grant execute on function public.save_school_session(uuid,uuid,uuid,uuid,uuid,uuid,date,time,time,text,text) to authenticated;

-- Optional, repeatable sample records for the dedicated demo workspace only.
create function public.seed_demo_school(p_school_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text,0));
  perform public.require_school_setup(p_school_id);
  if not exists(select 1 from public.schools where id=p_school_id and name='Sekolah Demo Jago Nyetir') or
    not exists(select 1 from public.school_memberships where school_id=p_school_id and user_id=auth.uid() and role='owner') then
    raise exception 'Demo school owner required' using errcode='42501';
  end if;
  insert into public.packages(school_id,id,name,normal_price,total_sessions) values
    (p_school_id,'00000000-0000-0000-0000-000000000101','Paket Matic Contoh',400000,4),
    (p_school_id,'00000000-0000-0000-0000-000000000102','Paket Manual Contoh',600000,6)
    on conflict do nothing;
  insert into public.students(school_id,id,name,status) values
    (p_school_id,'00000000-0000-0000-0000-000000000201','Murid Contoh A','Aktif'),
    (p_school_id,'00000000-0000-0000-0000-000000000202','Murid Contoh B','Aktif')
    on conflict do nothing;
  insert into public.instructors(school_id,id,name,transmission,notes) values
    (p_school_id,'00000000-0000-0000-0000-000000000301','Instruktur Contoh A','Matic','Data simulasi'),
    (p_school_id,'00000000-0000-0000-0000-000000000302','Instruktur Contoh B','Manual','Data simulasi')
    on conflict do nothing;
  insert into public.vehicles(school_id,id,name,transmission) values
    (p_school_id,'00000000-0000-0000-0000-000000000401','Mobil Matic Contoh','Matic'),
    (p_school_id,'00000000-0000-0000-0000-000000000402','Mobil Manual Contoh','Manual')
    on conflict do nothing;
  insert into public.student_enrollments(school_id,id,student_id,package_id,package_name,total_sessions) values
    (p_school_id,'00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Paket Matic Contoh',4),
    (p_school_id,'00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','Paket Manual Contoh',6)
    on conflict do nothing;
  insert into public.sessions(school_id,id,student_id,enrollment_id,instructor_id,vehicle_id,session_date,start_time,end_time,transmission,status) values
    (p_school_id,'00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000401',(now() at time zone 'Asia/Makassar')::date+1,'09:00','10:00','Matic','Menunggu konfirmasi')
    on conflict do nothing;
end $$;
revoke all on function public.seed_demo_school(uuid) from public;
grant execute on function public.seed_demo_school(uuid) to authenticated;
