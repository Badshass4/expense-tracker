# Supabase Database Setup Guide

## Overview

This document explains how to set up the Supabase database for the Expense Tracker application.

## Prerequisites

- ✅ Supabase project created
- ✅ Supabase URL and Anon Key obtained
- ✅ Access to Supabase dashboard

## Tables & Schema

### 1. **Categories Table**

Stores expense categories for each user.

- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign Key → auth.users)
- `name` - Category name (e.g., "Food & Dining")
- `color` - Hex color code
- `icon` - Icon identifier
- `description` - Optional category description

### 2. **Expenses Table**

Stores individual expenses for each user.

- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign Key → auth.users)
- `category_id` - UUID (Foreign Key → categories)
- `description` - Expense description
- `amount` - Expense amount (decimal)
- `expense_date` - Date of expense
- `notes` - Optional notes
- `receipt_url` - Optional receipt image URL

### 3. **User Profiles Table**

Stores additional user profile information.

- `id` - UUID (Primary Key/Foreign Key → auth.users)
- `full_name` - User's full name
- `avatar_url` - Profile picture URL
- `default_currency` - Preferred currency (default: INR)
- `monthly_budget` - Monthly budget limit
- `theme` - UI theme (light/dark)

### 4. **Budgets Table** (Optional)

For future budget tracking features.

- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign Key)
- `category_id` - UUID (Optional, per-category budgets)
- `limit_amount` - Budget limit
- `start_date` & `end_date` - Budget period

## Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Navigate to **SQL Editor** (sidebar)
4. Click **New Query**

### Step 2: Run the Schema Migration

1. Copy the entire content from `supabase_schema.sql`
2. Paste it into the SQL editor
3. Click **Run**
4. Wait for successful completion (you should see no errors)

### Step 3: Enable Realtime (Optional)

For real-time updates:

1. Go to **Replication** in sidebar
2. Enable replication for `expenses` and `categories` tables

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Copy the **JWT Secret** (Settings → API → JWT Secret)

### Step 5: Verify Tables

1. Go to **Table Editor**
2. You should see these tables:
   - `auth.users` (auto-created)
   - `categories`
   - `expenses`
   - `user_profiles`
   - `budgets`

## Features Set Up

### ✅ Row Level Security (RLS)

All tables have RLS enabled with policies:

- Users can only view their own data
- Users can only create/edit/delete their own records
- Automatic enforcement through Supabase auth

### ✅ Automatic Default Categories

When a new user signs up, 8 default categories are automatically created:

- Food & Dining
- Transport
- Entertainment
- Shopping
- Utilities
- Health
- Education
- Other

### ✅ Auto User Profile Creation

When a user signs up, their profile is automatically created.

### ✅ Analytics Views

Two pre-built views for analytics:

- `monthly_spending_summary` - Spending by month and category
- `spending_by_category` - Total spending by category

### ✅ Stored Procedures

- `get_expense_summary()` - Get overall expense statistics
- `get_monthly_breakdown()` - Get expenses for a specific month

### Data API Grants

The schema includes explicit `GRANT` statements for the public tables and analytics views. This is required for new Supabase projects created on or after May 30, 2026, where tables in the `public` schema are no longer exposed to PostgREST, GraphQL, or `supabase-js` by default.

When adding a new public table, add its `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ... TO anon, authenticated, service_role;` statement in the same migration as the table, RLS, and policies.

## API Keys Configuration

### For Backend (.env)

```env
SUPABASE_URL=https://tvjczkozaalnqfhcplcy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Frontend (.env.local)

```env
VITE_SUPABASE_URL=https://tvjczkozaalnqfhcplcy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5000/api
```

## Testing the Setup

### Test 1: Create Categories

```sql
INSERT INTO categories (user_id, name, color, icon)
VALUES ('your-user-id', 'Test Category', '#FF0000', 'test');
```

### Test 2: Create an Expense

```sql
INSERT INTO expenses (user_id, category_id, description, amount, expense_date)
VALUES ('your-user-id', 'category-id', 'Test expense', 50.00, NOW());
```

## Troubleshooting

### Problem: "Permission denied for schema"

**Solution**: Ensure you're logged in with a project owner or admin account.

### Problem: "Foreign key constraint failed"

**Solution**: Ensure the user_id exists in auth.users table before inserting.

### Problem: "RLS policies prevent access"

**Solution**: Ensure you're accessing data for the authenticated user only.

### Problem: "permission denied for table" or PostgREST suggests a GRANT

**Solution**: Re-run the `Data API Grants` section from `supabase_schema.sql`, or add the missing table-specific grant shown in the PostgREST error hint.

## Next Steps

1. ✅ Database schema created
2. 🔐 Implement authentication endpoints (backend)
3. 💰 Create expense management API endpoints
4. 🏷️ Create category management API endpoints
5. 📊 Create analytics endpoints

## Support

For Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
For SQL reference: [PostgreSQL Docs](https://www.postgresql.org/docs/)

## Backup & Restore

### Backup your database:

1. Go to **Settings** → **Backups**
2. Click **Take Backup**

### Restore from backup:

1. Go to **Settings** → **Backups**
2. Select backup and click **Restore**

---

**Schema Version**: 1.0
**Last Updated**: April 30, 2026
