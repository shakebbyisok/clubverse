-- Migration: Add Liquors and Sodas tables for ingredient-based drink management
-- Run this migration against your Supabase database

-- Create enum for liquor types
DO $$ BEGIN
    CREATE TYPE liquor_type AS ENUM ('vodka', 'gin', 'rum', 'whisky', 'tequila', 'brandy', 'liqueur', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for drink types
DO $$ BEGIN
    CREATE TYPE drink_type AS ENUM ('shot', 'cocktail', 'beer', 'wine', 'soda', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Liquors table
CREATE TABLE IF NOT EXISTS liquors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(100),
    liquor_type liquor_type NOT NULL DEFAULT 'other',
    description TEXT,
    shot_price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(500),
    display_order NUMERIC DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_liquor_club_name UNIQUE (club_id, name)
);

-- Create index on club_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_liquors_club_id ON liquors(club_id);
CREATE INDEX IF NOT EXISTS idx_liquors_name ON liquors(name);

-- Create Sodas table
CREATE TABLE IF NOT EXISTS sodas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(100),
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_addon NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    display_order NUMERIC DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_soda_club_name UNIQUE (club_id, name)
);

-- Create index on club_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sodas_club_id ON sodas(club_id);
CREATE INDEX IF NOT EXISTS idx_sodas_name ON sodas(name);

-- Add new columns to drinks table
ALTER TABLE drinks 
ADD COLUMN IF NOT EXISTS drink_type drink_type,
ADD COLUMN IF NOT EXISTS liquor_id UUID REFERENCES liquors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS soda_id UUID REFERENCES sodas(id) ON DELETE SET NULL;

-- Create indexes on the new foreign keys
CREATE INDEX IF NOT EXISTS idx_drinks_liquor_id ON drinks(liquor_id);
CREATE INDEX IF NOT EXISTS idx_drinks_soda_id ON drinks(soda_id);
CREATE INDEX IF NOT EXISTS idx_drinks_drink_type ON drinks(drink_type);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_liquors_updated_at ON liquors;
CREATE TRIGGER update_liquors_updated_at
    BEFORE UPDATE ON liquors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sodas_updated_at ON sodas;
CREATE TRIGGER update_sodas_updated_at
    BEFORE UPDATE ON sodas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables (if using Supabase RLS)
ALTER TABLE liquors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sodas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed based on your auth setup)
-- Allow authenticated users to read liquors for clubs they have access to
DROP POLICY IF EXISTS "Users can view liquors" ON liquors;
CREATE POLICY "Users can view liquors" ON liquors
    FOR SELECT USING (true);

-- Allow club owners to manage their liquors
DROP POLICY IF EXISTS "Club owners can manage liquors" ON liquors;
CREATE POLICY "Club owners can manage liquors" ON liquors
    FOR ALL USING (
        club_id IN (
            SELECT id FROM clubs WHERE owner_id = auth.uid()
        )
    );

-- Allow authenticated users to read sodas
DROP POLICY IF EXISTS "Users can view sodas" ON sodas;
CREATE POLICY "Users can view sodas" ON sodas
    FOR SELECT USING (true);

-- Allow club owners to manage their sodas
DROP POLICY IF EXISTS "Club owners can manage sodas" ON sodas;
CREATE POLICY "Club owners can manage sodas" ON sodas
    FOR ALL USING (
        club_id IN (
            SELECT id FROM clubs WHERE owner_id = auth.uid()
        )
    );

-- Comment on tables for documentation
COMMENT ON TABLE liquors IS 'Base liquors/spirits that can be used for shots and cocktails';
COMMENT ON TABLE sodas IS 'Mixers/sodas that can be combined with liquors to create cocktails';
COMMENT ON COLUMN drinks.drink_type IS 'Type of drink: shot (pure liquor), cocktail (liquor+soda), beer, wine, soda, other';
COMMENT ON COLUMN drinks.liquor_id IS 'Reference to the base liquor (for shots and cocktails)';
COMMENT ON COLUMN drinks.soda_id IS 'Reference to the mixer/soda (for cocktails)';

