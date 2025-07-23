-- Setup script for Realtime testing
-- Run this script in your Supabase database to create a test table

-- Create a test table for realtime subscriptions
CREATE TABLE IF NOT EXISTS public.test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.test_table ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for testing
-- Note: In production, you should create more restrictive policies
CREATE POLICY "Allow all operations for testing" ON public.test_table
    FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for this table
-- This allows the table to publish changes to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_table;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_table_updated_at
    BEFORE UPDATE ON public.test_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.test_table (name, description, status) VALUES
    ('Test Item 1', 'This is a test item for realtime testing', 'active'),
    ('Test Item 2', 'Another test item', 'inactive'),
    ('Test Item 3', 'Third test item', 'active')
ON CONFLICT DO NOTHING;

-- Display the created table structure
\d public.test_table;

-- Show sample data
SELECT * FROM public.test_table LIMIT 5; 