create table public.item_groups (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(150) not null,
  category public.category_enum not null,
  subcategory character varying(100) null,
  description text null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint item_groups_pkey primary key (id),
  constraint unique_group_category unique (name, category, subcategory)
) TABLESPACE pg_default;

create index IF not exists idx_item_groups_category on public.item_groups using btree (category) TABLESPACE pg_default;

create index IF not exists idx_item_groups_subcategory on public.item_groups using btree (subcategory) TABLESPACE pg_default;

create index IF not exists idx_item_groups_name on public.item_groups using btree (name) TABLESPACE pg_default;

create trigger update_item_groups_updated_at BEFORE
update on item_groups for EACH row
execute FUNCTION update_updated_at_column ();