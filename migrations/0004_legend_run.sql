alter table legend_board add column if not exists run_id text;
create unique index if not exists legend_board_run_id_uidx on legend_board (run_id) where run_id is not null;
