-- Fix RLS policies for primary_schools table
-- Run this in the Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to primary schools" ON public.primary_schools;
DROP POLICY IF EXISTS "Allow authenticated users to manage primary schools" ON public.primary_schools;

-- Disable RLS temporarily for data insertion
ALTER TABLE public.primary_schools DISABLE ROW LEVEL SECURITY;

-- Create new policies that allow service account access
-- Allow all operations for service role (which includes our service account)
CREATE POLICY "Allow service role full access to primary schools" ON public.primary_schools
    FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access
CREATE POLICY "Allow public read access to primary schools" ON public.primary_schools
    FOR SELECT USING (true);

-- Re-enable RLS
ALTER TABLE public.primary_schools ENABLE ROW LEVEL SECURITY;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'primary_schools'; 