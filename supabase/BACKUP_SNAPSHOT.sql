-- =====================================================================
-- BACKUP_SNAPSHOT.sql   READ-ONLY.  SAFE ON PRODUCTION.
-- ---------------------------------------------------------------------
-- The free Supabase plan has no backup feature. This is a stand-in.
--
-- It reads every table in your public schema and returns each one as a
-- block of text containing all of its rows. You then press the download
-- button above the results grid to save it to your computer.
--
-- This is a SNAPSHOT, not a restore button. If something were ever lost,
-- the data would be recoverable from this file, but it would take work
-- to put back. It is much better than nothing, which is what you have
-- right now.
--
-- It works out the table names by itself, so it cannot fail by naming a
-- table you don't have.
--
-- ONE query. It only reads. No CREATE / ALTER / INSERT / UPDATE /
-- DELETE / DROP anywhere in it.
--
-- HOW TO SAVE IT
--   1. Paste, press Run. It may take a few seconds.
--   2. Above the results, find the download / export button and choose
--      CSV. Save it somewhere outside this project folder.
--   3. That file is your snapshot. Keep it until the migration is done
--      and verified.
--
-- If it times out or the browser struggles, tell me and I'll narrow it
-- to just orders, transactions, users and products.
-- =====================================================================

select
  t.relname                                  as table_name,
  (xpath('/row/c/text()',
         query_to_xml(format('select count(*) as c from public.%I',
                             t.relname),
                      false, true, ''))
  )[1]::text::bigint                         as row_count,
  query_to_xml(format('select * from public.%I', t.relname),
               true,   -- include nulls
               false,  -- wrap the whole table in one element
               '')::text                     as all_rows
from pg_class t
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relkind = 'r'
order by t.relname;
