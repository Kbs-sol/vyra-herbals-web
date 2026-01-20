-- SAFE migration to mend missing review IDs and timestamps
-- BACKUP first
CREATE TABLE IF NOT EXISTS reviews_backup AS TABLE reviews;

-- 1) see how many missing ids
SELECT 'total', COUNT(*) FROM reviews;
SELECT 'missing_id', COUNT(*) FROM reviews WHERE id IS NULL;
SELECT 'missing_created_at', COUNT(*) FROM reviews WHERE created_at IS NULL;

-- 2) fill missing created_at with NOW()
UPDATE reviews SET created_at = NOW() WHERE created_at IS NULL;

-- 3) create a sequence starting after current max(id)
DO $$
DECLARE
  start_val bigint;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO start_val FROM reviews;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reviews_id_seq') THEN
    EXECUTE 'CREATE SEQUENCE reviews_id_seq START WITH ' || start_val;
  END IF;
END
$$;

-- 4) assign ids to rows missing id
UPDATE reviews SET id = nextval('reviews_id_seq') WHERE id IS NULL;

-- 5) ensure sequence ownership and default
ALTER SEQUENCE reviews_id_seq OWNED BY reviews.id;
ALTER TABLE reviews ALTER COLUMN id SET DEFAULT nextval('reviews_id_seq');

-- 6) ensure primary key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'reviews' AND tc.constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE reviews ADD PRIMARY KEY (id);
  END IF;
END
$$;

-- 7) sanity checks
SELECT 'after_missing_id', COUNT(*) FROM reviews WHERE id IS NULL;
SELECT 'total_rows', COUNT(*) FROM reviews;

-- 8) Quick sample
SELECT id, product_id, reviewer_name, status, created_at FROM reviews LIMIT 10;