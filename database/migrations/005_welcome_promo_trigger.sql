-- 005_welcome_promo_trigger.sql
-- Automatically schedules the 3-hour welcome promo whenever a new customer with a phone number
-- is registered in the `users` table.

CREATE OR REPLACE FUNCTION schedule_welcome_promo_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if phone number is present and valid
  IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) >= 10 THEN
    INSERT INTO message_queue (
      customer_phone,
      message_type,
      status,
      provider,
      template_name,
      parameters,
      scheduled_for,
      dedupe_key,
      payload
    ) VALUES (
      NEW.phone,
      'MANUAL',
      'pending',
      'whatsapp',
      'welcome_promo_3hr',
      jsonb_build_array(COALESCE(NULLIF(TRIM(NEW.name), ''), 'there')),
      NOW() + INTERVAL '3 hours',
      'PROMO_3HR:' || NEW.id,
      jsonb_build_object(
        'user_id', NEW.id,
        'name', NEW.name,
        'phone', NEW.phone,
        'trigger_source', 'postgres_trigger'
      )
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_user_registered_welcome_promo ON users;

CREATE TRIGGER trg_user_registered_welcome_promo
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION schedule_welcome_promo_on_user_insert();
