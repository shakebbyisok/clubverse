"""
Migration script to add hybrid category support:
- Add is_system column to categories table
- Add icon column to categories table
- Make club_id nullable for system categories
- Seed system categories

Run from backend directory:
    python scripts/migrate_categories_hybrid.py
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# System categories to seed
SYSTEM_CATEGORIES = [
    {"name": "Cocktails", "description": "Mixed drinks and cocktails", "display_order": 0},
    {"name": "Beers", "description": "Draft and bottled beers", "display_order": 1},
    {"name": "Wines", "description": "Red, white, and sparkling wines", "display_order": 2},
    {"name": "Shots", "description": "Shot glasses and shooters", "display_order": 3},
    {"name": "Sodas", "description": "Soft drinks and mixers", "display_order": 4},
    {"name": "Spirits", "description": "Premium spirits and liquors", "display_order": 5},
    {"name": "Non-Alcoholic", "description": "Mocktails and alcohol-free drinks", "display_order": 6},
]


def run_migration():
    """Run the migration to add hybrid category support"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Starting migration for hybrid categories...")
        
        # Step 1: Add is_system column if it doesn't exist
        print("1. Adding is_system column...")
        try:
            conn.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE NOT NULL
            """))
            conn.commit()
            print("   ✓ is_system column added")
        except Exception as e:
            print(f"   Note: {e}")
        
        # Step 2: Add icon column if it doesn't exist
        print("2. Adding icon column...")
        try:
            conn.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS icon VARCHAR(10)
            """))
            conn.commit()
            print("   ✓ icon column added")
        except Exception as e:
            print(f"   Note: {e}")
        
        # Step 3: Make club_id nullable (for system categories)
        print("3. Making club_id nullable...")
        try:
            conn.execute(text("""
                ALTER TABLE categories 
                ALTER COLUMN club_id DROP NOT NULL
            """))
            conn.commit()
            print("   ✓ club_id is now nullable")
        except Exception as e:
            print(f"   Note: {e}")
        
        # Step 4: Create index on is_system for faster queries
        print("4. Creating index on is_system...")
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_categories_is_system 
                ON categories (is_system)
            """))
            conn.commit()
            print("   ✓ Index created")
        except Exception as e:
            print(f"   Note: {e}")
        
        # Step 5: Seed system categories
        print("5. Seeding system categories...")
        for cat_data in SYSTEM_CATEGORIES:
            # Check if already exists
            result = conn.execute(text("""
                SELECT id FROM categories 
                WHERE is_system = TRUE AND name = :name
            """), {"name": cat_data["name"]})
            
            if result.fetchone():
                print(f"   - {cat_data['name']} already exists, skipping")
                continue
            
            # Insert system category
            conn.execute(text("""
                INSERT INTO categories (id, name, description, icon, display_order, is_system, club_id, is_active)
                VALUES (gen_random_uuid(), :name, :description, :icon, :display_order, TRUE, NULL, TRUE)
            """), cat_data)
            print(f"   ✓ Created system category: {cat_data['name']}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    run_migration()

