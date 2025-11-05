create table public.items (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  category public.category_enum not null,
  subcategory character varying(100) null,
  reference_url text null,
  image_url text null,
  description text null,
  item_year integer null,
  view_count integer null default 0,
  selection_count integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  "group" character varying(150) null,
  item_year_to integer null,
  group_id uuid null,
  constraint items_pkey primary key (id),
  constraint unique_item unique (name, category, subcategory),
  constraint items_group_id_fkey foreign KEY (group_id) references item_groups (id) on delete set null,
  constraint check_year_range check (
    (
      (item_year_to is null)
      or (item_year is null)
      or (item_year_to >= item_year)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_items_category on public.items using btree (category) TABLESPACE pg_default;

create index IF not exists idx_items_subcategory on public.items using btree (subcategory) TABLESPACE pg_default;

create index IF not exists idx_items_item_year on public.items using btree (item_year) TABLESPACE pg_default;

create index IF not exists idx_items_group on public.items using btree ("group") TABLESPACE pg_default;

create index IF not exists idx_items_year_range on public.items using btree (item_year, item_year_to) TABLESPACE pg_default;

create index IF not exists idx_items_sports_group on public.items using btree ("group") TABLESPACE pg_default
where
  (category = 'sports'::category_enum);

create index IF not exists idx_items_group_id on public.items using btree (group_id) TABLESPACE pg_default;

create trigger update_items_updated_at BEFORE
update on items for EACH row
execute FUNCTION update_updated_at_column ();