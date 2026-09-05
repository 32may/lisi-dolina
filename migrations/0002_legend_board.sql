create table if not exists legend_board (
  id         serial primary key,
  name       text not null,
  score      integer not null default 0,
  coins      integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists legend_board_id_idx on legend_board (id);
