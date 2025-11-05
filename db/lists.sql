create table public.lists (
  id uuid not null default extensions.uuid_generate_v4 (),
  title character varying(255) not null,
  category public.category_enum not null,
  subcategory character varying(100) null,
  user_id uuid null,
  predefined boolean null default false,
  size integer null default 50,
  time_period character varying(50) null default 'all'::character varying,
  parent_list_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lists_pkey primary key (id),
  constraint lists_parent_list_id_fkey foreign KEY (parent_list_id) references lists (id) on delete set null,
  constraint lists_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint lists_size_check check (
    (
      (size > 0)
      and (size <= 100)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_lists_category on public.lists using btree (category) TABLESPACE pg_default;

create index IF not exists idx_lists_subcategory on public.lists using btree (subcategory) TABLESPACE pg_default;

create index IF not exists idx_lists_user_id on public.lists using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_lists_predefined on public.lists using btree (predefined) TABLESPACE pg_default;

create trigger update_lists_updated_at BEFORE
update on lists for EACH row
execute FUNCTION update_updated_at_column ();