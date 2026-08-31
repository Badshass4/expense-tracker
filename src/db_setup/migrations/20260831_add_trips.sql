-- Run this once in the Supabase SQL editor for an existing installation.
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  destination VARCHAR(120),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE trips TO anon, authenticated, service_role;
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trips" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE USING (auth.uid() = user_id);
