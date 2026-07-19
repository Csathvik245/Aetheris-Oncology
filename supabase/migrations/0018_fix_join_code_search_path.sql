-- Pin search_path on the join-code functions added in 0017 (flagged by
-- db advisors as function_search_path_mutable).

create or replace function generate_join_code() returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function set_institution_join_code() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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
$$;
