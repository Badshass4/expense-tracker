# 📚 Expense Tracker - Complete Setup Guide

## 🎯 Current Status: **Phase 1 Complete** ✅

All infrastructure is set up and ready for API development!

---

## 📁 Project Structure

```
expense-tracker/
├── backend/                          # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js          # Supabase client
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication
│   │   │   └── errorHandler.js      # Error handling
│   │   ├── routes/
│   │   │   └── index.js             # Route definitions
│   │   ├── controllers/             # Route handlers (to be created)
│   │   ├── utils/
│   │   │   ├── errors.js            # Error classes
│   │   │   └── jwt.js               # Token utilities
│   │   └── index.js                 # Main server file
│   ├── .env                         # Environment variables
│   ├── package.json                 # Dependencies
│   └── README.md                    # Documentation
│
├── frontend/                         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Navigation
│   │   │   ├── Header.jsx           # Top bar
│   │   │   └── ProtectedRoute.jsx   # Auth guard
│   │   ├── config/
│   │   │   └── supabase.js          # Supabase client
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── ExpensesPage.jsx
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance
│   │   │   └── index.js             # API services
│   │   ├── stores/
│   │   │   └── index.js             # Zustand stores
│   │   ├── App.jsx                  # Main component
│   │   ├── main.jsx                 # Entry point
│   │   └── style.css                # Tailwind styles
│   ├── .env                         # Environment variables
│   ├── vite.config.js              # Vite config
│   ├── tailwind.config.js          # Tailwind config
│   ├── package.json                # Dependencies
│   └── README.md                   # Documentation
│
├── supabase_schema.sql              # 🆕 Complete database schema
├── SUPABASE_SETUP_GUIDE.md         # 🆕 Step-by-step setup
├── DATABASE_SCHEMA.md              # 🆕 Visual schema diagrams
├── SETUP_CHECKLIST.md              # 🆕 Full project checklist
└── README.md                       # Main documentation

```

---

## ⚡ Quick Start

### 1️⃣ Setup Supabase Database (REQUIRED)

**Step 1: Open Supabase SQL Editor**

1. Go to https://supabase.com
2. Select your project
3. Click **SQL Editor** in the sidebar
4. Click **New Query**

**Step 2: Run the Schema**

1. Open file: `supabase_schema.sql`
2. Copy all content
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ Wait for success message

**Step 3: Verify Tables**

- Go to **Table Editor** in sidebar
- Confirm these tables exist:
  - categories
  - expenses
  - user_profiles
  - budgets

### 2️⃣ Start Backend Server

```bash
cd backend
npm run dev
```

🔗 Backend runs on: **http://localhost:5000**

### 3️⃣ Start Frontend App

```bash
cd frontend
npm run dev
```

🔗 Frontend runs on: **http://localhost:5173**

---

## 🗄️ Database Tables

| Table             | Purpose             | Auto-Created           |
| ----------------- | ------------------- | ---------------------- |
| **categories**    | Expense categories  | ✅ 8 defaults per user |
| **expenses**      | Individual expenses | ❌ Manual              |
| **user_profiles** | User profile info   | ✅ On signup           |
| **budgets**       | Budget tracking     | ❌ Manual (future)     |

### Default Categories

When users sign up, these are auto-created:

1. 🍽️ Food & Dining
2. 🚗 Transport
3. 🎬 Entertainment
4. 🛍️ Shopping
5. ⚡ Utilities
6. ❤️ Health
7. 📚 Education
8. 🔧 Other

---

## 🔐 Credentials Setup

### Already Configured ✅

- Frontend: `.env` with Supabase keys
- Backend: `.env` with Supabase keys + JWT secret

### What You Need to Know

- **Supabase URL**: https://tvjczkozaalnqfhcplcy.supabase.co
- **JWT Secret**: Set in `backend/.env`
- **CORS**: Configured for localhost:5173

---

## 📱 API Architecture

```
Frontend (React + Vite)
    ↓
Axios HTTP Client (with JWT interceptors)
    ↓
Backend API (Express + Node.js)
    ↓
Supabase (PostgreSQL + Auth + RLS)
```

### Endpoints Structure (To Be Built)

```
Authentication
├── POST /api/auth/register
├── POST /api/auth/login
└── POST /api/auth/logout

Expenses
├── GET /api/expenses (with filters)
├── POST /api/expenses
├── PUT /api/expenses/:id
└── DELETE /api/expenses/:id

Categories
├── GET /api/categories
├── POST /api/categories
├── PUT /api/categories/:id
└── DELETE /api/categories/:id

Analytics
├── GET /api/analytics/summary
├── GET /api/analytics/monthly
└── GET /api/analytics/budget
```

---

## 🔒 Security Features

### Row Level Security (RLS)

- Users can **only** see their own data
- Enforced at database level
- Automatic on all tables

### Authentication

- Email/Password via Supabase Auth
- JWT tokens with 7-day expiry
- Automatic token refresh (to be implemented)

### Data Protection

- Foreign key constraints
- Unique constraints on user+name combinations
- Soft delete ready (can be added)

---

## 📊 Analytics Built-In

### Views Available

1. **monthly_spending_summary** - Spending by month & category
2. **spending_by_category** - Total per category

### Stored Procedures

1. `get_expense_summary()` - Overall statistics
2. `get_monthly_breakdown()` - Month-specific expenses

---

## 🚀 What's Next?

### Phase 2 Tasks (Priority Order)

1. ✅ **Database Setup** - DONE!
2. 🔐 **Authentication API** - Next!
   - Register endpoint
   - Login endpoint
   - Token generation
3. 💰 **Expense CRUD API**
   - Create, Read, Update, Delete
   - Filtering & pagination
4. 🏷️ **Category API**
   - Manage categories
   - Link to expenses
5. 📈 **Analytics API**
   - Summary endpoint
   - Monthly breakdown

---

## 📖 Documentation Files

| File                      | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `supabase_schema.sql`     | Complete database schema with 400+ lines of SQL |
| `SUPABASE_SETUP_GUIDE.md` | Step-by-step setup instructions                 |
| `DATABASE_SCHEMA.md`      | Visual diagrams and relationship info           |
| `SETUP_CHECKLIST.md`      | Full project checklist with 60+ tasks           |
| `backend/README.md`       | Backend-specific documentation                  |
| `frontend/README.md`      | Frontend-specific documentation                 |

---

## 🆘 Troubleshooting

### "Database schema not found"

- Run the SQL script in Supabase SQL Editor
- Check that all tables appear in Table Editor

### "Cannot connect to Supabase"

- Verify credentials in .env files
- Check Supabase project is active
- Ensure API keys are correct

### "Frontend can't reach backend"

- Backend must be running on port 5000
- Check CORS_ORIGIN in backend/.env
- Verify VITE_API_URL in frontend/.env

### "RLS Permission Denied"

- This means authentication is working!
- Ensure you're logged in with correct user
- Check RLS policies in Supabase dashboard

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **React Docs**: https://react.dev
- **Express Docs**: https://expressjs.com
- **Vite Docs**: https://vitejs.dev

---

## ✅ Verification Checklist

Before moving to Phase 2, verify:

- [ ] Supabase project created
- [ ] SQL schema imported successfully
- [ ] All 4 tables visible in Supabase Table Editor
- [ ] Backend runs on http://localhost:5000 with `npm run dev`
- [ ] Frontend runs on http://localhost:5173 with `npm run dev`
- [ ] Backend .env has SUPABASE_URL and SUPABASE_ANON_KEY
- [ ] Frontend .env has VITE_API_URL and SUPABASE keys
- [ ] Default categories appear in Supabase when created

---

## 📊 Tech Stack Summary

| Layer          | Technology    | Purpose             |
| -------------- | ------------- | ------------------- |
| **Frontend**   | React 18      | UI Framework        |
| **Styling**    | Tailwind CSS  | Utility CSS         |
| **Routing**    | React Router  | Client routing      |
| **HTTP**       | Axios         | API calls           |
| **State**      | Zustand       | State management    |
| **Backend**    | Express       | REST API            |
| **Database**   | PostgreSQL    | Data storage        |
| **Auth**       | Supabase Auth | User authentication |
| **Deployment** | TBD           | Production ready    |

---

## 🎉 You're All Set!

**Phase 1 (Infrastructure) is complete!**

Next: Build the authentication and expense management APIs.

Would you like me to start with the authentication endpoints or another API?

---

**Created**: April 30, 2026
**Status**: Ready for Phase 2
**Last Updated**: April 30, 2026
