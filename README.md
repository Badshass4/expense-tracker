# Expense Tracker Backend

Node.js + Express backend for the Expense Tracker application.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required environment variables:**

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### 3. Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your Project URL and Anon Key from Settings → API
4. Paste them into `.env`

### 4. Run the Server

**Development Mode** (with auto-reload):

```bash
npm run dev
```

**Production Mode**:

```bash
npm start
```

Server will run on `http://localhost:5000`

## Project Structure

```
src/
├── config/           # Configuration files (Supabase client)
├── middleware/       # Express middleware (auth, error handling)
├── routes/          # API route definitions
├── controllers/     # Request handlers
├── utils/           # Helper utilities (JWT, error classes)
└── index.js         # Main server file
```

## API Endpoints

### Health Check

- `GET /api/health` - Check if server is running

### Authentication

- `POST /api/auth/register` - Register with Supabase Auth
- `POST /api/auth/login` - Login with Supabase Auth
- `GET /api/auth/me` - Get the current Supabase Auth user
- `POST /api/auth/logout` - Confirm client-side logout

#### Register request

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Example User"
}
```

#### Login request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Successful register and login responses include `data.token`, which is the Supabase access token. Send it to protected routes as:

```http
Authorization: Bearer <token>
```

## Next Steps

1. Setup Supabase database schema
2. Create authentication routes and controllers
3. Create expense management routes and controllers
4. Create category management routes and controllers
5. Create analytics routes and controllers

## Dependencies

- **express** - Web framework
- **@supabase/supabase-js** - Supabase client
- **cors** - Cross-origin resource sharing
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables
- **nodemon** (dev) - Auto-reload server during development
