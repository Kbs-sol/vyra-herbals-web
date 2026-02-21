-- =============================================
-- ADD MISSING COLUMNS TO ORDERS TABLE
-- =============================================
-- This script adds user_id and txn_id columns to the orders table
-- Run this in your Supabase SQL Editor
-- =============================================

DO $$ 
BEGIN
  -- 1. Add user_id column if it doesn't exist
  -- UUID references users(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added user_id column to orders table';
  END IF;

  -- 2. Add txn_id column if it doesn't exist
  -- TEXT for payment gateway transaction ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'txn_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN txn_id TEXT;
    RAISE NOTICE 'Added txn_id column to orders table';
  END IF;

END $$;

-- Enable indexing for the new columns
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_txn_id ON orders(txn_id);
