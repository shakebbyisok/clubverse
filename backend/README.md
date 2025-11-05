# Clubverse Backend API

FastAPI backend for Clubverse - a nightlife drink ordering platform.

## Tech Stack

- **Framework:** FastAPI
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL (Supabase)
- **Authentication:** JWT
- **Payment:** Stripe
- **Hosting:** GCP

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment variables:**
Copy `.env.example` to `.env` and fill in your values:
- Database connection (Supabase PostgreSQL)
- Stripe API keys
- JWT secret key

3. **Run database migrations:**
The app will create tables automatically on first run (using `Base.metadata.create_all`).

For production, use Alembic migrations instead.

4. **Run the server:**
```bash
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py          # Authentication
│   │           ├── clubs.py         # Club management
│   │           ├── orders.py        # Customer orders
│   │           ├── bartender.py     # Bartender operations
│   │           ├── bartenders.py   # Bartender management
│   │           └── payments.py      # Stripe webhooks
│   ├── core/
│   │   ├── config.py                # Settings
│   │   ├── security.py              # JWT & password hashing
│   │   ├── dependencies.py          # Auth dependencies
│   │   ├── stripe_service.py        # Stripe integration
│   │   └── qr_service.py            # QR code generation
│   ├── db/
│   │   └── base.py                  # Database setup
│   ├── models/                      # SQLAlchemy models
│   ├── schemas/                     # Pydantic schemas
│   └── main.py                      # FastAPI app
├── requirements.txt
└── .env.example
```

## Key Features

### Authentication
- User registration (customer, club_owner)
- JWT-based authentication
- Role-based access control

### Clubs
- Club registration and management
- Drink CRUD operations
- Bartender management

### Orders
- Order creation with Stripe Payment Intent
- QR code generation after payment
- Order status tracking

### Bartenders
- QR code scanning
- Order status updates (preparing → ready → completed)

### Payments
- Stripe Payment Intent creation
- Webhook handling for payment confirmation
- Support for Apple Pay and Google Pay

## Environment Variables

See `.env.example` for all required variables.

## Deployment

For GCP deployment:
1. Use Cloud Run for the FastAPI app
2. Use Cloud SQL or Supabase for PostgreSQL
3. Configure environment variables in Cloud Run
4. Set up Stripe webhook endpoint

