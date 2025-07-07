-- Enable RLS
-- alter table auth.users enable row level security;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create notes table
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled',
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  is_shared boolean default false,
  share_id text unique,
  default_permission text check (default_permission in ('read', 'write')) default 'read'
);

-- Create note_collaborators table
create table public.note_collaborators (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  permission text check (permission in ('read', 'write')) default 'read',
  created_at timestamptz default now(),
  unique(note_id, user_id)
);

-- Create storage bucket for images
insert into storage.buckets (id, name, public) values ('note-images', 'note-images', true);

-- RLS Policies

-- Profiles policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Notes policies
create policy "Users can view own notes" on notes
  for select using (auth.uid() = user_id);

create policy "Users can view shared notes" on notes
  for select using (
    is_shared = true or 
    auth.uid() = user_id or
    exists (
      select 1 from note_collaborators 
      where note_id = notes.id and user_id = auth.uid()
    )
  );

create policy "Users can insert own notes" on notes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own notes" on notes
  for update using (
    auth.uid() = user_id or
    exists (
      select 1 from note_collaborators 
      where note_id = notes.id and user_id = auth.uid() and permission = 'write'
    )
  );

create policy "Users can delete own notes" on notes
  for delete using (auth.uid() = user_id);

-- Note collaborators policies
create policy "Users can view collaborators of their notes" on note_collaborators
  for select using (
    exists (select 1 from notes where id = note_id and user_id = auth.uid()) or
    user_id = auth.uid()
  );

create policy "Note owners can manage collaborators" on note_collaborators
  for all using (
    exists (select 1 from notes where id = note_id and user_id = auth.uid())
  );

-- Storage policies
create policy "Users can upload images" on storage.objects
  for insert with check (
    bucket_id = 'note-images' and
    auth.role() = 'authenticated'
  );

create policy "Users can view images" on storage.objects
  for select using (bucket_id = 'note-images');

create policy "Users can update own images" on storage.objects
  for update using (
    bucket_id = 'note-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own images" on storage.objects
  for delete using (
    bucket_id = 'note-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Functions and triggers
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_notes_updated_at
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create table public.note_versions (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  content text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  changes jsonb, -- Optional: store change summary as JSON
  created_at timestamptz default now()
);

-- Policy: Only note owner or collaborators can insert/view
create policy "Can view note versions" on note_versions
  for select using (
    exists (
      select 1 from notes
      where id = note_id
      and (
        user_id = auth.uid()
        or exists (
          select 1 from note_collaborators
          where note_id = notes.id and user_id = auth.uid()
        )
      )
    )
  );

create policy "Can insert note versions" on note_versions
  for insert with check (
    exists (
      select 1 from notes
      where id = note_id
      and (
        user_id = auth.uid()
        or exists (
          select 1 from note_collaborators
          where note_id = notes.id and user_id = auth.uid()
        )
      )
    )
  );
