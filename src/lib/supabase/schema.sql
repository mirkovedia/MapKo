-- ============================================================================
-- MapKo — Supabase SQL Schema
-- ============================================================================
-- Run this file in the Supabase SQL Editor to create all tables, indexes,
-- RLS policies, and trigger functions.
-- ============================================================================


-- ============================================================================
-- Section: Helper Functions
-- ============================================================================

-- Auto-update the updated_at column on row modification.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create a profile row when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;


-- ============================================================================
-- Section: Tables
-- ============================================================================

-- 1. profiles — user profiles linked to auth.users
create table public.profiles (
  id             uuid             primary key default gen_random_uuid(),
  user_id        uuid             references auth.users not null unique,
  company_name   text,
  plan           text             not null default 'free'
                                  check (plan in ('free', 'pro', 'agency')),
  scans_this_month int            not null default 0,
  stripe_customer_id text,
  created_at     timestamptz      not null default now(),
  updated_at     timestamptz      not null default now()
);

comment on table public.profiles is 'User profiles — one per auth.users entry.';

-- 2. scans — scan jobs
create table public.scans (
  id               uuid             primary key default gen_random_uuid(),
  user_id          uuid             references auth.users not null,
  query_text       text             not null,
  lat              double precision not null,
  lng              double precision not null,
  radius_km        double precision not null default 2,
  categories       text[]           not null default '{}',
  status           text             not null default 'queued'
                                    check (status in ('queued', 'scanning', 'analyzing', 'completed', 'failed')),
  total_businesses int              not null default 0,
  error_message    text,
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz      not null default now()
);

comment on table public.scans is 'Each row represents one map-scan job.';

-- 3. businesses — businesses discovered during a scan
create table public.businesses (
  id               uuid             primary key default gen_random_uuid(),
  scan_id          uuid             references public.scans on delete cascade not null,
  place_id         text             not null,
  name             text             not null,
  address          text             not null,
  lat              double precision not null,
  lng              double precision not null,
  category         text             not null,
  phone            text,
  website_url      text,
  rating           double precision,
  review_count     int              not null default 0,
  photo_count      int              not null default 0,
  business_status  text             not null default 'OPERATIONAL',
  google_data      jsonb            not null default '{}',
  created_at       timestamptz      not null default now(),

  unique (scan_id, place_id)
);

comment on table public.businesses is 'Businesses found during a scan (Google Places results).';

-- 4. analyses — analysis results per business
create table public.analyses (
  id                    uuid             primary key default gen_random_uuid(),
  business_id           uuid             references public.businesses on delete cascade not null unique,
  has_website           boolean          not null default false,
  website_ssl           boolean          not null default false,
  website_responsive    boolean          not null default false,
  website_load_time_ms  int,
  website_tech          text,
  has_social_media      boolean          not null default false,
  social_links          jsonb            not null default '{}',
  review_response_rate  double precision not null default 0,
  has_booking           boolean          not null default false,
  has_whatsapp          boolean          not null default false,
  profile_completeness  double precision not null default 0,
  opportunity_score     int              not null default 0,
  recommendations       text[]           not null default '{}',
  analyzed_at           timestamptz      not null default now()
);

comment on table public.analyses is 'Digital-presence analysis for each business.';

-- 5. exports — export history
create table public.exports (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  scan_id     uuid        references public.scans on delete cascade not null,
  format      text        not null default 'csv'
                          check (format in ('csv', 'xlsx')),
  file_url    text        not null,
  created_at  timestamptz not null default now()
);

comment on table public.exports is 'Tracks every file export a user generates.';


-- ============================================================================
-- Section: Indexes
-- ============================================================================

create index idx_scans_user_id            on public.scans        (user_id);
create index idx_businesses_scan_id       on public.businesses   (scan_id);
create index idx_businesses_place_id      on public.businesses   (place_id);
create index idx_analyses_business_id     on public.analyses     (business_id);
create index idx_analyses_opportunity     on public.analyses     (opportunity_score);


-- ============================================================================
-- Section: Triggers
-- ============================================================================

-- updated_at triggers
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_scans_updated_at
  before update on public.scans
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- Section: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles   enable row level security;
alter table public.scans      enable row level security;
alter table public.businesses enable row level security;
alter table public.analyses   enable row level security;
alter table public.exports    enable row level security;

-- ---- profiles ----
create policy "Users can view their own profile"
  on public.profiles for select
  using (user_id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (user_id = auth.uid());

-- ---- scans ----
create policy "Users can view their own scans"
  on public.scans for select
  using (user_id = auth.uid());

create policy "Users can insert their own scans"
  on public.scans for insert
  with check (user_id = auth.uid());

create policy "Users can update their own scans"
  on public.scans for update
  using (user_id = auth.uid());

create policy "Users can delete their own scans"
  on public.scans for delete
  using (user_id = auth.uid());

-- ---- businesses (access via the scan's user_id) ----
create policy "Users can view businesses from their scans"
  on public.businesses for select
  using (
    exists (
      select 1 from public.scans
      where scans.id = businesses.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can insert businesses into their scans"
  on public.businesses for insert
  with check (
    exists (
      select 1 from public.scans
      where scans.id = businesses.scan_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can delete businesses from their scans"
  on public.businesses for delete
  using (
    exists (
      select 1 from public.scans
      where scans.id = businesses.scan_id
        and scans.user_id = auth.uid()
    )
  );

-- ---- analyses (access via the business's scan's user_id) ----
create policy "Users can view analyses from their scans"
  on public.analyses for select
  using (
    exists (
      select 1 from public.businesses
      join public.scans on scans.id = businesses.scan_id
      where businesses.id = analyses.business_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can insert analyses for their businesses"
  on public.analyses for insert
  with check (
    exists (
      select 1 from public.businesses
      join public.scans on scans.id = businesses.scan_id
      where businesses.id = analyses.business_id
        and scans.user_id = auth.uid()
    )
  );

create policy "Users can update analyses for their businesses"
  on public.analyses for update
  using (
    exists (
      select 1 from public.businesses
      join public.scans on scans.id = businesses.scan_id
      where businesses.id = analyses.business_id
        and scans.user_id = auth.uid()
    )
  );

-- ---- exports ----
create policy "Users can view their own exports"
  on public.exports for select
  using (user_id = auth.uid());

create policy "Users can insert their own exports"
  on public.exports for insert
  with check (user_id = auth.uid());
