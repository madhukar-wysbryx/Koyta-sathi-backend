# Koyta-Sathi — Backend

REST API for the Koyta-Sathi budgeting app, built for sugarcane workers in Maharashtra as part of a Harvard University & SOPPECOM research initiative.

Built with **NestJS**, **PostgreSQL**, **Drizzle ORM**, and **JWT authentication**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | JWT + Passport + bcryptjs |
| AI | Google Gemini API |
| Validation | class-validator + class-transformer |

---

## Project Structure

```
src/
├── common/
│   ├── decorators/        # @CurrentUser decorator
│   ├── dto/               # Shared DTOs
│   ├── guards/            # JwtAuthGuard
│   └── strategies/        # JWT Passport strategy
├── db/
│   ├── db.service.ts      # PostgreSQL pool + Drizzle instance
│   └── schema.ts          # All table definitions & relations
└── modules/
    ├── auth/              # Signup, Login
    ├── user/              # Profile management
    ├── ledger/            # Advance & repayment tracking
    ├── quiz/              # Budget literacy quiz
    ├── priority/          # Priority plan & prioritizing game
    ├── past-season/       # Historical season data
    └── gemini/            # AI-powered budget advice
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>"

# JWT
JWT_SECRET="your_strong_secret_key"

# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key"

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Push schema to database

```bash
npm run db:push
```

### 4. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
node dist/src/main
```

Server runs at `http://localhost:3000`

---

## API Endpoints

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/signup` | ✗ | Register a new user |
| POST | `/login` | ✗ | Login, returns JWT token |
| GET | `/test` | ✗ | Health check |

### User — `/api/user`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/profile` | ✓ | Get current user profile |
| POST | `/profile` | ✓ | Update name & village |
| POST | `/complete-onboarding` | ✓ | Mark onboarding complete |

### Ledger — `/api/ledger`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | Get all transactions + summary |
| POST | `/entry` | ✓ | Add advance taken or repayment |
| GET | `/stats` | ✓ | Get borrowing statistics |
| GET | `/warnings` | ✓ | Get budget warnings |
| POST | `/warnings/:id/read` | ✓ | Mark warning as read |

### Quiz — `/api/quiz`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/questions` | ✓ | Get quiz questions |
| POST | `/submit` | ✓ | Submit answers, get score |
| GET | `/results` | ✓ | Get past quiz results |
| GET | `/best-score` | ✓ | Get user's best score |

### Priority — `/api/priority`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/available` | ✓ | Get available priority items |
| GET | `/current` | ✓ | Get active priority plan |
| GET | `/plan/:seasonYear` | ✓ | Get plan for a specific season |
| POST | `/plan` | ✓ | Create a new priority plan |
| POST | `/prioritizing-game` | ✓ | Save prioritizing game results |

### Past Season — `/api/past-season`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | Get all past season records |
| GET | `/options` | ✓ | Get available season year options |
| GET | `/:year` | ✓ | Get data for a specific year |
| POST | `/` | ✓ | Add past season data |

### Gemini AI — `/api/gemini`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/budget-advice` | ✓ | Get AI budget advice |
| POST | `/explain-quiz` | ✓ | Get AI explanation for wrong quiz answer |
| POST | `/narrate-story` | ✓ | Narrate Geeta Tai's story |
| POST | `/voice-to-expense` | ✓ | Convert voice input to expense entry |
| POST | `/welcome` | ✓ | Get personalised welcome message |

---

## Database Scripts

```bash
# Push schema changes directly to DB (recommended for development)
npm run db:push

# Generate a new migration file
npm run db:generate

# Open Drizzle Studio (visual DB browser)
npm run db:studio
```

---

## Authentication

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are returned from `/api/auth/signup` and `/api/auth/login`.
