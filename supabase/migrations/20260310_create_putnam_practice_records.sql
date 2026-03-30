create table if not exists public.putnam_practice_records (
  problem_key text primary key,
  year integer not null,
  problem text not null,
  status text not null,
  last_attempted_at timestamptz null,
  total_minutes integer not null default 0,
  attempt_count integer not null default 0,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists putnam_practice_records_updated_at_idx
  on public.putnam_practice_records (updated_at desc);
