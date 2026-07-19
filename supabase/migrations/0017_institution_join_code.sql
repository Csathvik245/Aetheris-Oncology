-- Faculty-facing join code: replaces the old "search by institution name"
-- signup flow with a code residents/faculty enter to link to a specific
-- institution, closing the gap where anyone could join any institution
-- just by knowing/searching its name.

alter table institutions add column join_code text unique;

create or replace function generate_join_code() returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I ambiguity
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

revoke all on function generate_join_code() from anon, authenticated, public;

create or replace function set_institution_join_code() returns trigger as $$
declare
  candidate text;
  tries int := 0;
begin
  if new.join_code is not null then
    return new;
  end if;
  loop
    candidate := generate_join_code();
    tries := tries + 1;
    exit when tries > 10 or not exists (select 1 from institutions where join_code = candidate);
  end loop;
  new.join_code := candidate;
  return new;
end;
$$ language plpgsql;

revoke all on function set_institution_join_code() from anon, authenticated, public;

create trigger institutions_set_join_code
before insert on institutions
for each row execute function set_institution_join_code();

-- Backfill existing institutions (created before this migration) with a
-- real code — the trigger above only fires on INSERT.
do $$
declare
  r record;
  candidate text;
  tries int;
begin
  for r in select id from institutions where join_code is null loop
    tries := 0;
    loop
      candidate := generate_join_code();
      tries := tries + 1;
      exit when tries > 10 or not exists (select 1 from institutions where join_code = candidate);
    end loop;
    update institutions set join_code = candidate where id = r.id;
  end loop;
end $$;

alter table institutions alter column join_code set not null;
