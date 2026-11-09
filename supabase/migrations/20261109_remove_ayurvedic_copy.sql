-- Brand rule: Vyra Herbals never uses the word "Ayurvedic".
-- Rewrites product + category descriptions already stored in the live database.
-- Safe to re-run (idempotent).
UPDATE products
SET description = REPLACE(REPLACE(REPLACE(REPLACE(description,
      'ancient Ayurvedic formulations', 'time-honoured herbal formulations'),
      'Traditional Ayurvedic', 'Traditional herbal'),
      'Ayurvedic', 'herbal'),
      'ayurvedic', 'herbal')
WHERE description ILIKE '%ayurved%';

UPDATE categories
SET description = REPLACE(REPLACE(description, 'Ayurvedic', 'herbal'), 'ayurvedic', 'herbal')
WHERE description ILIKE '%ayurved%';
