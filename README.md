# Attendance App (minimal)

## Prerequisites
- Node 18+
- PostgreSQL running

## Setup backend

1. cd backend
2. copy .env.example to .env and fill DATABASE_URL and JWT_SECRET
3. npm install
4. Run the SQL migration: psql $DATABASE_URL -f src/migrations/001_init.sql
   - Note: update the admin password hash manually or create admin user via script
5. npm run dev

## Setup frontend

1. cd frontend
2. npm install
3. Set REACT_APP_API_BASE in .env if backend not on default http://localhost:4000
4. npm start

Now open the frontend at http://localhost:3000 and login.