create table public.list_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  list_id uuid not null,
  item_id uuid not null,
  ranking integer not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint list_items_pkey primary key (id),
  constraint unique_item_per_list unique (list_id, item_id),
  constraint unique_ranking_per_list unique (list_id, ranking),
  constraint list_items_item_id_fkey foreign KEY (item_id) references items (id) on delete CASCADE,
  constraint list_items_list_id_fkey foreign KEY (list_id) references lists (id) on delete CASCADE,
  constraint list_items_ranking_check check ((ranking > 0))
) TABLESPACE pg_default;

create index IF not exists idx_list_items_list_id on public.list_items using btree (list_id) TABLESPACE pg_default;

create index IF not exists idx_list_items_ranking on public.list_items using btree (list_id, ranking) TABLESPACE pg_default;

create trigger trigger_rerank_list_items BEFORE INSERT
or
update on list_items for EACH row
execute FUNCTION rerank_list_items ();

create trigger update_list_items_updated_at BEFORE
update on list_items for EACH row
execute FUNCTION update_updated_at_column ();