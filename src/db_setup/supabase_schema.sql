-- ===========================
-- Expense Tracker Database Schema
-- ===========================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. Create User Profiles Table (for additional user data)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  avatar_url TEXT,
  default_currency VARCHAR(3) DEFAULT 'USD',
  monthly_budget DECIMAL(10, 2),
  theme VARCHAR(10) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 4. Create Budgets Table (Optional - for future budget tracking)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  limit_amount DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold DECIMAL(3, 2) DEFAULT 0.8,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, category_id, start_date)
);

-- ===========================
-- Create Indexes for Performance
-- ===========================

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- ===========================
-- Enable Row Level Security (RLS)
-- ===========================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- ===========================
-- Row Level Security Policies
-- ===========================

-- Categories: Users can only see their own categories
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses: Users can only see their own expenses
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- User Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Budgets: Users can only see their own budgets
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- Create Default Categories for New Users (Optional)
-- ===========================

-- This function will be used to create default categories when a user signs up
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, color, icon) VALUES
    (NEW.id, 'Rent', '#0B74DE', 'home'),
    (NEW.id, 'Bills', '#F59E0B', 'file-invoice'),
    (NEW.id, 'Grocery & Flowers', '#EF4444', 'shopping-cart'),
    (NEW.id, 'Outside Food', '#FB7185', 'utensils'),
    (NEW.id, 'Shopping', '#EC4899', 'shopping-bag'),
    (NEW.id, 'Travel', '#6366F1', 'plane'),
    (NEW.id, 'Bike', '#0EA5E9', 'bicycle'),
    (NEW.id, 'Salon', '#A855F7', 'scissors'),
    (NEW.id, 'Medicine', '#10B981', 'first-aid'),
    (NEW.id, 'Utilities', '#F97316', 'zap'),
    (NEW.id, 'Health', '#22C55E', 'heart'),
    (NEW.id, 'Other', '#6B7280', 'dots-horizontal');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger will call the function when a new user is created
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_categories();

-- ===========================
-- Create User Profile Trigger
-- ===========================

-- Auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_profile_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile();

-- ===========================
-- Create Analytics View
-- ===========================

-- View for monthly spending summary
CREATE OR REPLACE VIEW monthly_spending_summary AS
SELECT
  e.user_id,
  DATE_TRUNC('month', e.expense_date)::DATE as month,
  c.id as category_id,
  c.name as category_name,
  c.color,
  SUM(e.amount) as total_amount,
  COUNT(e.id) as expense_count
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY e.user_id, DATE_TRUNC('month', e.expense_date), c.id, c.name, c.color;

-- View for total spending by category
CREATE OR REPLACE VIEW spending_by_category AS
SELECT
  e.user_id,
  c.id as category_id,
  c.name as category_name,
  c.color,
  SUM(e.amount) as total_amount,
  COUNT(e.id) as expense_count,
  AVG(e.amount) as average_expense
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY e.user_id, c.id, c.name, c.color;

-- ===========================
-- Stored Procedures for Backend
-- ===========================

-- Procedure to get expense summary
CREATE OR REPLACE FUNCTION get_expense_summary(p_user_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE(
  total_expenses DECIMAL,
  total_categories INT,
  average_expense DECIMAL,
  highest_category VARCHAR,
  highest_category_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(e.amount)::DECIMAL,
    COUNT(DISTINCT e.category_id)::INT,
    AVG(e.amount)::DECIMAL,
    c.name::VARCHAR,
    SUM(e.amount)::DECIMAL
  FROM expenses e
  LEFT JOIN categories c ON e.category_id = c.id
  WHERE e.user_id = p_user_id
    AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
    AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
  GROUP BY c.name
  ORDER BY SUM(e.amount) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Procedure to get monthly breakdown
CREATE OR REPLACE FUNCTION get_monthly_breakdown(p_user_id UUID, p_year INT, p_month INT)
RETURNS TABLE(
  expense_date DATE,
  description VARCHAR,
  category_name VARCHAR,
  amount DECIMAL,
  expense_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.expense_date,
    e.description::VARCHAR,
    c.name::VARCHAR,
    e.amount,
    e.id
  FROM expenses e
  JOIN categories c ON e.category_id = c.id
  WHERE e.user_id = p_user_id
    AND EXTRACT(YEAR FROM e.expense_date) = p_year
    AND EXTRACT(MONTH FROM e.expense_date) = p_month
  ORDER BY e.expense_date DESC;
END;
$$ LANGUAGE plpgsql;
