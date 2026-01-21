-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('employee', 'admin')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Employees table (master roster)
create table public.employees (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  display_order integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS on employees
alter table public.employees enable row level security;

-- Employees policies
create policy "Anyone can view employees"
  on public.employees for select
  using (true);

create policy "Admins can manage employees"
  on public.employees for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Services table
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price decimal(10,2) not null,
  is_half_turn boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS on services
alter table public.services enable row level security;

-- Services policies
create policy "Anyone can view services"
  on public.services for select
  using (true);

create policy "Admins can manage services"
  on public.services for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Daily sessions table
create table public.daily_sessions (
  id uuid primary key default uuid_generate_v4(),
  date date unique not null,
  created_at timestamptz default now()
);

-- Enable RLS on daily_sessions
alter table public.daily_sessions enable row level security;

-- Daily sessions policies
create policy "Anyone can view sessions"
  on public.daily_sessions for select
  using (true);

create policy "Authenticated users can create sessions"
  on public.daily_sessions for insert
  with check (auth.uid() is not null);

-- Clock-ins table
create table public.clock_ins (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.daily_sessions(id) on delete cascade not null,
  employee_id uuid references public.employees(id) on delete cascade not null,
  clock_in_time timestamptz not null default now(),
  clock_out_time timestamptz,
  position integer not null,
  unique(session_id, employee_id)
);

-- Enable RLS on clock_ins
alter table public.clock_ins enable row level security;

-- Clock-ins policies
create policy "Anyone can view clock-ins"
  on public.clock_ins for select
  using (true);

create policy "Authenticated users can manage clock-ins"
  on public.clock_ins for all
  using (auth.uid() is not null);

-- Turns table
create table public.turns (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.daily_sessions(id) on delete cascade not null,
  employee_id uuid references public.employees(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete cascade not null,
  turn_number integer not null,
  is_half_turn boolean not null,
  status text default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS on turns
alter table public.turns enable row level security;

-- Turns policies
create policy "Anyone can view turns"
  on public.turns for select
  using (true);

create policy "Authenticated users can manage turns"
  on public.turns for all
  using (auth.uid() is not null);

-- Create indexes for performance
create index idx_clock_ins_session on public.clock_ins(session_id);
create index idx_clock_ins_employee on public.clock_ins(employee_id);
create index idx_turns_session on public.turns(session_id);
create index idx_turns_employee on public.turns(employee_id);
create index idx_turns_status on public.turns(status);
create index idx_daily_sessions_date on public.daily_sessions(date);

-- Function to handle new user signup (creates profile)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable realtime for relevant tables
alter publication supabase_realtime add table public.clock_ins;
alter publication supabase_realtime add table public.turns;
