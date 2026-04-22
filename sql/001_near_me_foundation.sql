create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text,
  country_code text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cities_identity_idx
  on public.cities (lower(name), country_code, coalesce(lower(region), ''));

create table if not exists public.roasters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website text,
  country_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists roasters_name_idx
  on public.roasters (lower(name));

create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  country_code text not null,
  address_line1 text,
  address_line2 text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  website text,
  phone text,
  photo_url text,
  summary text,
  status text not null default 'active',
  review_count integer not null default 0,
  average_rating numeric(3,2),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cafes_status_check check (status in ('active', 'hidden', 'duplicate', 'closed')),
  constraint cafes_average_rating_check check (average_rating is null or (average_rating >= 1 and average_rating <= 10))
);

create index if not exists cafes_city_id_idx on public.cafes (city_id);
create index if not exists cafes_country_city_idx on public.cafes (country_code, city_id);
create index if not exists cafes_geo_idx on public.cafes (latitude, longitude);
create index if not exists cafes_rank_idx on public.cafes (review_count desc, average_rating desc);
create index if not exists cafes_active_idx on public.cafes (city_id, slug) where status = 'active';

create table if not exists public.cafe_roasters (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  roaster_id uuid not null references public.roasters(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (cafe_id, roaster_id)
);

create table if not exists public.cafe_tags (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  tag text not null,
  source text not null default 'editorial',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (cafe_id, tag)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  rating integer not null,
  note text not null,
  drink text,
  anon_id text,
  user_id uuid,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_rating_check check (rating between 1 and 10),
  constraint reviews_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint reviews_actor_check check (anon_id is not null or user_id is not null)
);

create index if not exists reviews_cafe_created_idx on public.reviews (cafe_id, created_at desc);
create index if not exists reviews_cafe_status_created_idx on public.reviews (cafe_id, status, created_at desc);
create index if not exists reviews_anon_cafe_idx on public.reviews (anon_id, cafe_id);

create table if not exists public.review_tags (
  review_id uuid not null references public.reviews(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (review_id, tag)
);

create table if not exists public.review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reason text not null,
  reported_by_anon_id text,
  reported_by_user_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.place_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_places (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.place_sources(id) on delete restrict,
  external_id text not null,
  raw_name text not null,
  raw_address text,
  raw_city text,
  raw_country_code text,
  latitude double precision,
  longitude double precision,
  website text,
  phone text,
  payload jsonb not null default '{}'::jsonb,
  canonical_cafe_id uuid references public.cafes(id) on delete set null,
  match_status text not null default 'unmatched',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint source_places_match_status_check check (match_status in ('unmatched', 'matched', 'duplicate', 'ignored'))
);

create unique index if not exists source_places_source_external_idx
  on public.source_places (source_id, external_id);

create or replace function public.refresh_cafe_review_aggregate()
returns trigger
language plpgsql
as $$
declare
  target_cafe_id uuid;
begin
  target_cafe_id := coalesce(new.cafe_id, old.cafe_id);

  update public.cafes
  set
    review_count = coalesce(agg.review_count, 0),
    average_rating = agg.average_rating,
    last_reviewed_at = agg.last_reviewed_at,
    updated_at = timezone('utc', now())
  from (
    select
      cafe_id,
      count(*) filter (where status = 'approved')::integer as review_count,
      round(avg(rating) filter (where status = 'approved')::numeric, 2) as average_rating,
      max(created_at) filter (where status = 'approved') as last_reviewed_at
    from public.reviews
    where cafe_id = target_cafe_id
    group by cafe_id
  ) agg
  where public.cafes.id = agg.cafe_id;

  update public.cafes
  set
    review_count = 0,
    average_rating = null,
    last_reviewed_at = null,
    updated_at = timezone('utc', now())
  where id = target_cafe_id
    and not exists (
      select 1
      from public.reviews
      where cafe_id = target_cafe_id
        and status = 'approved'
    );

  return null;
end;
$$;

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists roasters_set_updated_at on public.roasters;
create trigger roasters_set_updated_at
before update on public.roasters
for each row execute function public.set_updated_at();

drop trigger if exists cafes_set_updated_at on public.cafes;
create trigger cafes_set_updated_at
before update on public.cafes
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists source_places_set_updated_at on public.source_places;
create trigger source_places_set_updated_at
before update on public.source_places
for each row execute function public.set_updated_at();

drop trigger if exists reviews_refresh_cafe_aggregate_insert on public.reviews;
create trigger reviews_refresh_cafe_aggregate_insert
after insert on public.reviews
for each row execute function public.refresh_cafe_review_aggregate();

drop trigger if exists reviews_refresh_cafe_aggregate_update on public.reviews;
create trigger reviews_refresh_cafe_aggregate_update
after update on public.reviews
for each row execute function public.refresh_cafe_review_aggregate();

drop trigger if exists reviews_refresh_cafe_aggregate_delete on public.reviews;
create trigger reviews_refresh_cafe_aggregate_delete
after delete on public.reviews
for each row execute function public.refresh_cafe_review_aggregate();
