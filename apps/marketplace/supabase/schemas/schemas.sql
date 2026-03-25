-- Marketplace schema (declarative)
-- Goal: community-submitted marketplace listings with Supabase approval workflow.

-- Enums
create type public.marketplace_listing_type as enum ('oauth', 'template');
create type public.marketplace_review_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected'
);
create type public.marketplace_partner_role as enum (
  'partner',
  'reviewer',
  'admin'
);
create type public.marketplace_initiation_method as enum ('POST', 'GET');

-- Partners represent companies/projects that publish marketplace listings.
create table public.partners (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  role public.marketplace_partner_role not null default 'partner',
  description text,
  website text,
  logo_url text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.partner_members (
  partner_id bigint not null references public.partners (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id),
  constraint partner_members_role_check check (role in ('member', 'admin'))
);

-- Listings represent marketplace entries shown after approval.
create table public.listings (
  id bigint generated always as identity primary key,
  partner_id bigint not null references public.partners (id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text,
  content text, -- markdown body
  published boolean not null default false,
  type public.marketplace_listing_type not null,
  url text,
  registry_listing_url text,
  files text[] not null default '{}'::text[],
  documentation_url text,
  initiation_action_url text,
  initiation_action_method public.marketplace_initiation_method,
  submitted_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint listings_type_destination_check check (
    (
      type = 'oauth'
      and registry_listing_url is null
      and (published = false or url is not null)
    )
    or (
      type = 'template'
      and url is null
      and (published = false or registry_listing_url is not null)
    )
  ),
  constraint listings_initiation_action_check check (
    (initiation_action_url is null and initiation_action_method is null)
    or (initiation_action_url is not null and initiation_action_method is not null)
  )
);

-- Marketplace categories (e.g. auth, analytics, cms, etc).
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Many-to-many between categories and listings.
create table public.category_listings (
  category_id bigint not null references public.categories (id) on delete cascade,
  listing_id bigint not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, listing_id)
);

-- Moderation fields are isolated here so partners cannot alter them.
create table public.listing_reviews (
  listing_id bigint primary key references public.listings (id) on delete cascade,
  status public.marketplace_review_status not null default 'pending_review',
  featured boolean not null default false,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Helper predicates for RLS
create function public.is_admin_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_members pm
    inner join public.partners p on p.id = pm.partner_id
    where pm.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;



create function public.is_partner_member(target_partner_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_members pm
    where pm.partner_id = target_partner_id
      and pm.user_id = auth.uid()
  ) or exists (
    select 1
    from public.partners p
    where p.id = target_partner_id
      and p.created_by = auth.uid()
  );
$$;

create function public.is_partner_admin(target_partner_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_members pm
    where pm.partner_id = target_partner_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  );
$$;

create function public.is_reviewer_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_members pm
    inner join public.partners p on p.id = pm.partner_id
    where pm.user_id = auth.uid()
      and p.role = 'reviewer'
  );
$$;

create function public.is_review_manager_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_members pm
    inner join public.partners p on p.id = pm.partner_id
    where pm.user_id = auth.uid()
      and p.role in ('reviewer', 'admin')
  );
$$;

create function public.listing_latest_review_is_approved(target_listing_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lr.status = 'approved'
      from public.listing_reviews lr
      where lr.listing_id = target_listing_id
      order by coalesce(lr.reviewed_at, lr.updated_at, lr.created_at) desc
      limit 1
    ),
    false
  );
$$;

create function public.storage_object_partner_id(object_name text)
returns bigint
language sql
stable
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9]+$' then split_part(object_name, '/', 1)::bigint
    else null
  end;
$$;

create function public.storage_object_listing_id(object_name text)
returns bigint
language sql
stable
as $$
  select case
    when split_part(object_name, '/', 3) ~ '^[0-9]+$' then split_part(object_name, '/', 3)::bigint
    else null
  end;
$$;

create function public.add_partner_member(
  target_partner_id bigint,
  target_email text,
  target_role text default 'member'
)
returns public.partner_members
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text;
  target_user_id uuid;
  inserted_row public.partner_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_partner_admin(target_partner_id) then
    raise exception 'Only partner admins can add members';
  end if;

  normalized_role := lower(trim(coalesce(target_role, 'member')));
  if normalized_role not in ('member', 'admin') then
    raise exception 'Invalid member role';
  end if;

  select u.id
  into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No user found with that email';
  end if;

  insert into public.partner_members (partner_id, user_id, role)
  values (target_partner_id, target_user_id, normalized_role)
  on conflict (partner_id, user_id)
  do update set role = excluded.role
  returning * into inserted_row;

  return inserted_row;
end;
$$;

-- Auth hook: restrict marketplace signups to internal Supabase emails.
create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  email text := lower(trim(coalesce(event->'user'->>'email', event->>'email', '')));
  domain text;
begin
  if email = '' or position('@' in email) = 0 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'A valid @supabase.io email address is required to sign up.',
        'http_code', 403
      )
    );
  end if;

  domain := split_part(email, '@', 2);

  if domain <> 'supabase.io' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Only @supabase.io email addresses can sign up.',
        'http_code', 403
      )
    );
  end if;

  return event;
end;
$$;


-- Helpful indexes for common read paths.
create index listings_type_idx on public.listings (type);
create index listings_partner_id_idx on public.listings (partner_id);
create index partner_members_user_id_idx on public.partner_members (user_id);
create index category_listings_listing_id_idx on public.category_listings (listing_id);
create index listing_reviews_status_idx on public.listing_reviews (status);
create index listing_reviews_featured_idx on public.listing_reviews (featured) where featured = true;

-- Row Level Security
alter table public.partners enable row level security;
alter table public.partner_members enable row level security;
alter table public.listings enable row level security;
alter table public.categories enable row level security;
alter table public.category_listings enable row level security;
alter table public.listing_reviews enable row level security;

-- Partners
create policy "partners_select"
  on public.partners
  for select
  using (
    public.is_admin_member()
    or created_by = auth.uid()
    or public.is_partner_member(id)
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.partner_id = partners.id
        and l.published = true
        and public.listing_latest_review_is_approved(l.id)
    )
  );

create policy "partners_insert"
  on public.partners
  for insert
  with check (
    public.is_admin_member()
    or (auth.uid() is not null and created_by = auth.uid())
  );

create policy "partners_update"
  on public.partners
  for update
  using (
    public.is_admin_member()
    or public.is_partner_member(id)
  )
  with check (
    public.is_admin_member()
    or public.is_partner_member(id)
  );

create policy "partners_delete"
  on public.partners
  for delete
  using (
    public.is_admin_member()
    or public.is_partner_member(id)
  );

-- Partner members
create policy "partner_members_select"
  on public.partner_members
  for select
  using (
    public.is_admin_member()
    or user_id = auth.uid()
    or public.is_partner_member(partner_id)
  );

create policy "partner_members_modify_admin_only"
  on public.partner_members
  for all
  using (public.is_admin_member())
  with check (public.is_admin_member());

create policy "partner_members_insert_creator_as_admin"
  on public.partner_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1
      from public.partners p
      where p.id = partner_id
        and p.created_by = auth.uid()
    )
  );

create policy "partner_members_insert_admin"
  on public.partner_members
  for insert
  with check (
    public.is_partner_admin(partner_id)
    and role in ('member', 'admin')
  );

-- Listings
create policy "listings_select"
  on public.listings
  for select
  using (
    public.is_admin_member()
    or public.is_partner_member(partner_id)
    or public.is_reviewer_member()
  );

create policy "listings_insert"
  on public.listings
  for insert
  with check (
    public.is_admin_member()
    or (
      public.is_partner_member(partner_id)
      and submitted_by = auth.uid()
    )
  );

create policy "listings_update"
  on public.listings
  for update
  using (
    public.is_admin_member()
    or public.is_partner_member(partner_id)
  )
  with check (
    public.is_admin_member()
    or public.is_partner_member(partner_id)
  );

create policy "listings_delete"
  on public.listings
  for delete
  using (
    public.is_admin_member()
    or public.is_partner_member(partner_id)
  );

create policy "listings_select_published_with_latest_approved_review"
  on public.listings
  for select
  using (
    published = true
    and public.listing_latest_review_is_approved(id)
  );

-- Categories: readable by anyone, writable by admin members.
create policy "categories_select_all"
  on public.categories
  for select
  using (true);

create policy "categories_modify_admin_only"
  on public.categories
  for all
  using (public.is_admin_member())
  with check (public.is_admin_member());

-- Category listing mappings: partner members can manage mappings for their own listings.
create policy "category_listings_select"
  on public.category_listings
  for select
  using (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and l.published = true
        and public.listing_latest_review_is_approved(l.id)
    )
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and public.is_partner_member(l.partner_id)
    )
  );

create policy "category_listings_insert"
  on public.category_listings
  for insert
  with check (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and public.is_partner_member(l.partner_id)
    )
  );

create policy "category_listings_update"
  on public.category_listings
  for update
  using (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and public.is_partner_member(l.partner_id)
    )
  )
  with check (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and public.is_partner_member(l.partner_id)
    )
  );

create policy "category_listings_delete"
  on public.category_listings
  for delete
  using (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = category_listings.listing_id
        and public.is_partner_member(l.partner_id)
    )
  );

-- Listing reviews: partners can view their own status, reviewer/admin partners can modify.
create policy "listing_reviews_select"
  on public.listing_reviews
  for select
  using (
    public.is_admin_member()
    or public.is_reviewer_member()
    or exists (
      select 1
      from public.listings l
      where l.id = listing_reviews.listing_id
        and public.is_partner_member(l.partner_id)
    )
  );

create policy "listing_reviews_insert_reviewer"
  on public.listing_reviews
  for insert
  with check (public.is_review_manager_member());

create policy "listing_reviews_insert_partner_request"
  on public.listing_reviews
  for insert
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_reviews.listing_id
        and public.is_partner_member(l.partner_id)
    )
    and status = 'pending_review'
    and featured = false
    and reviewed_by is null
    and reviewed_at is null
    and review_notes is null
    and published_at is null
  );

create policy "listing_reviews_update_reviewer"
  on public.listing_reviews
  for update
  using (public.is_review_manager_member())
  with check (public.is_review_manager_member());

create policy "listing_reviews_delete_reviewer"
  on public.listing_reviews
  for delete
  using (public.is_review_manager_member());

-- Column-level permissions: partner role assignment is managed manually by service role.
revoke insert (role) on table public.partners from anon, authenticated;
revoke update (role) on table public.partners from anon, authenticated;
grant insert (role) on table public.partners to service_role;
grant update (role) on table public.partners to service_role;

revoke all on function public.add_partner_member(bigint, text, text) from public;
grant execute on function public.add_partner_member(bigint, text, text) to authenticated;
revoke all on function public.storage_object_partner_id(text) from public;
revoke all on function public.storage_object_listing_id(text) from public;
grant execute on function public.storage_object_partner_id(text) to authenticated;
grant execute on function public.storage_object_listing_id(text) to authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created_hook(jsonb) from authenticated, anon, public;

insert into storage.buckets (id, name, public)
values
  ('listing_files', 'listing_files', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

-- Storage policies for marketplace listing files.
create policy "listing_files_storage_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'listing_files'
    and split_part(name, '/', 2) = 'listings'
    and public.storage_object_partner_id(name) is not null
    and public.storage_object_listing_id(name) is not null
    and exists (
      select 1
      from public.listings l
      where l.id = public.storage_object_listing_id(name)
        and l.partner_id = public.storage_object_partner_id(name)
        and (
          public.is_admin_member()
          or
          public.is_review_manager_member()
          or public.is_partner_member(l.partner_id)
        )
    )
  );

create policy "listing_files_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing_files'
    and split_part(name, '/', 2) = 'listings'
    and public.storage_object_partner_id(name) is not null
    and public.storage_object_listing_id(name) is not null
    and exists (
      select 1
      from public.listings l
      where l.id = public.storage_object_listing_id(name)
        and l.partner_id = public.storage_object_partner_id(name)
        and (
          public.is_admin_member()
          or public.is_partner_member(l.partner_id)
        )
    )
  );

create policy "listing_files_storage_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing_files'
    and split_part(name, '/', 2) = 'listings'
    and public.storage_object_partner_id(name) is not null
    and public.storage_object_listing_id(name) is not null
    and exists (
      select 1
      from public.listings l
      where l.id = public.storage_object_listing_id(name)
        and l.partner_id = public.storage_object_partner_id(name)
        and (
          public.is_admin_member()
          or public.is_partner_member(l.partner_id)
        )
    )
  )
  with check (
    bucket_id = 'listing_files'
    and split_part(name, '/', 2) = 'listings'
    and public.storage_object_partner_id(name) is not null
    and public.storage_object_listing_id(name) is not null
    and exists (
      select 1
      from public.listings l
      where l.id = public.storage_object_listing_id(name)
        and l.partner_id = public.storage_object_partner_id(name)
        and (
          public.is_admin_member()
          or public.is_partner_member(l.partner_id)
        )
    )
  );

create policy "listing_files_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing_files'
    and split_part(name, '/', 2) = 'listings'
    and public.storage_object_partner_id(name) is not null
    and public.storage_object_listing_id(name) is not null
    and exists (
      select 1
      from public.listings l
      where l.id = public.storage_object_listing_id(name)
        and l.partner_id = public.storage_object_partner_id(name)
        and (
          public.is_admin_member()
          or public.is_partner_member(l.partner_id)
        )
    )
  );
