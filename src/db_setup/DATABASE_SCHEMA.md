# Database Schema Visualization

## Entity Relationship Diagram

````
┌─────────────────────┐
│   auth.users        │
│  (Supabase Auth)    │
│─────────────────────│
│ id (UUID)           │◄──┐
│ email               │   │
│ created_at          │   │
└─────────────────────┘   │
         ▲                 │
         │                 │
    ┌────┴────┬────────────┼────────────┐
    │         │            │            │
    │         │            │            │
    │         │            │            │
┌───┴───┐ ┌──┴──┐ ┌───────┴───┐ ┌────┴───┐
│       │ │     │ │           │ │        │
│Categ. │ │Exp. │ │ Profiles  │ │Budgets │
└───────┘ └─────┘ └───────────┘ └────────┘


## Table Details

### Categories
┌──────────────────────────────────┐
│          categories              │
├──────────────────────────────────┤
│ id (PK, UUID)                    │
│ user_id (FK) → auth.users(id)    │
│ name (VARCHAR 50)                │
│ color (VARCHAR 7, e.g. #FF0000)  │
│ icon (VARCHAR 50)                │
│ description (TEXT)               │
│ created_at (TIMESTAMP)           │
│ updated_at (TIMESTAMP)           │
│ UNIQUE(user_id, name)            │
└──────────────────────────────────┘

### Expenses
┌──────────────────────────────────┐
│           expenses               │
├──────────────────────────────────┤
│ id (PK, UUID)                    │
│ user_id (FK) → auth.users(id)    │
│ category_id (FK) → categories    │
│ description (VARCHAR 255)        │
│ amount (DECIMAL 10,2)            │
│ expense_date (DATE)              │
│ notes (TEXT)                     │
│ receipt_url (TEXT)               │
│ created_at (TIMESTAMP)           │
│ updated_at (TIMESTAMP)           │
└──────────────────────────────────┘

### User Profiles
┌──────────────────────────────────┐
│        user_profiles             │
├──────────────────────────────────┤
│ id (PK, FK) → auth.users(id)     │
│ full_name (VARCHAR 100)          │
│ avatar_url (TEXT)                │
│ default_currency (VARCHAR 3)     │
│ monthly_budget (DECIMAL 10,2)    │
│ theme (VARCHAR 10)               │
│ created_at (TIMESTAMP)           │
│ updated_at (TIMESTAMP)           │
└──────────────────────────────────┘

### Budgets
┌──────────────────────────────────┐
│          budgets                 │
├──────────────────────────────────┤
│ id (PK, UUID)                    │
│ user_id (FK) → auth.users(id)    │
│ category_id (FK) → categories    │
│ limit_amount (DECIMAL 10,2)      │
│ start_date (DATE)                │
│ end_date (DATE)                  │
│ alert_threshold (DECIMAL 3,2)    │
│ created_at (TIMESTAMP)           │
│ updated_at (TIMESTAMP)           │
│ UNIQUE(user_id, category_id)     │
└──────────────────────────────────┘

## Indexes Created

- idx_expenses_user_id (expenses.user_id)
- idx_expenses_category_id (expenses.category_id)
- idx_expenses_date (expenses.expense_date)
- idx_expenses_user_date (expenses.user_id, expense_date)
- idx_categories_user_id (categories.user_id)
- idx_budgets_user_id (budgets.user_id)

## Views Created

1. **monthly_spending_summary**
   - Groups expenses by month and category
   - Shows total amount and count per category per month

2. **spending_by_category**
   - Shows total spending per category
   - Includes average expense amount

## Stored Procedures

1. **get_expense_summary(user_id, start_date, end_date)**
   - Returns: total_expenses, total_categories, average_expense, highest_category

2. **get_monthly_breakdown(user_id, year, month)**
   - Returns: All expenses for a specific month

## Triggers

1. **on_auth_user_created**
   - Automatically creates 8 default categories when user signs up

2. **on_auth_user_profile_created**
   - Automatically creates user profile when auth user is created

## Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

### Categories
- SELECT: User can view own categories
- INSERT: User can create own categories
- UPDATE: User can update own categories
- DELETE: User can delete own categories

### Expenses
- SELECT: User can view own expenses
- INSERT: User can create own expenses
- UPDATE: User can update own expenses
- DELETE: User can delete own expenses

### User Profiles
- SELECT: User can view own profile
- INSERT: User can create own profile
- UPDATE: User can update own profile

### Budgets
- SELECT: User can view own budgets
- INSERT: User can create own budgets
- UPDATE: User can update own budgets
- DELETE: User can delete own budgets

## Default Categories Auto-Created

When a user signs up, these categories are automatically created:

1. 🍽️ Food & Dining (Red #EF4444)
2. 🚗 Transport (Amber #F59E0B)
3. 🎬 Entertainment (Purple #8B5CF6)
4. 🛍️ Shopping (Pink #EC4899)
5. ⚡ Utilities (Indigo #6366F1)
6. ❤️ Health (Green #10B981)
7. 📚 Education (Cyan #06B6D4)
8. 🔧 Other (Gray #6B7280)

## SQL Example Queries

### Get all expenses for current user
```sql
SELECT * FROM expenses
WHERE user_id = auth.uid()
ORDER BY expense_date DESC;
````

### Get spending by category (current month)

```sql
SELECT
  c.name,
  SUM(e.amount) as total,
  COUNT(*) as count
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE e.user_id = auth.uid()
  AND DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', NOW())
GROUP BY c.name
ORDER BY total DESC;
```

### Get expenses for a date range

```sql
SELECT * FROM expenses
WHERE user_id = auth.uid()
  AND expense_date BETWEEN '2026-01-01' AND '2026-04-30'
ORDER BY expense_date DESC;
```

## Performance Optimization

- Indexed all foreign keys and frequently queried columns
- Date filtering indexed for fast month-based queries
- User ID indexed for quick lookups
- Composite index on (user_id, expense_date) for common queries
