from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Use Supabase DB URL if provided, otherwise use DATABASE_URL
database_url = settings.SUPABASE_DB_URL or settings.DATABASE_URL

# Check if using Supabase connection pooler
is_supabase_pooler = "pooler.supabase.com" in database_url or "supabase.co" in database_url

# Add SSL mode for Supabase connections
if is_supabase_pooler:
    if "?" not in database_url:
        database_url += "?sslmode=require"
    elif "sslmode" not in database_url:
        database_url += "&sslmode=require"

# Configure connection pool
# For Supabase pooler, use conservative settings to avoid connection issues
pool_config = {
    "pool_pre_ping": True,  # Verify connections before using (reconnects if stale)
    "echo": False,
    "connect_args": {
        "connect_timeout": 10,  # 10 second connection timeout
        "keepalives": 1,  # Send keepalive packets
        "keepalives_idle": 30,  # Start keepalives after 30 seconds idle
        "keepalives_interval": 10,  # Send keepalive every 10 seconds
        "keepalives_count": 5,  # Max keepalive failures before disconnect
    }
}

if is_supabase_pooler:
    # Supabase pooler: use conservative pool settings
    # Check if using Transaction mode (port 6543) vs Session mode (port 5432)
    is_transaction_mode = ":6543" in database_url
    
    if is_transaction_mode:
        # Transaction mode: better for short-lived connections, more scalable
        pool_config.update({
            "pool_size": 5,
            "max_overflow": 2,  # Allow 2 overflow connections
            "pool_recycle": 300,  # Recycle after 5 minutes (shorter for transaction mode)
            "pool_timeout": 20,  # Wait up to 20 seconds for a connection
        })
    else:
        # Session mode: limited connections but allow some overflow
        pool_config.update({
            "pool_size": 3,  # Increased from 2
            "max_overflow": 2,  # Allow 2 overflow connections
            "pool_recycle": 600,  # Recycle after 10 minutes (reduced from 30)
            "pool_timeout": 20,  # Wait up to 20 seconds for a connection
        })
else:
    # Standard PostgreSQL: can use larger pool
    pool_config.update({
        "pool_size": 10,
        "max_overflow": 5,
        "pool_recycle": 3600,
    })

engine = create_engine(database_url, **pool_config)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        # Always close the session to return connection to pool
        # This is critical for connection pool management
        db.close()

