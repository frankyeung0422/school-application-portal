-- Create primary_schools table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.primary_schools (
    id SERIAL PRIMARY KEY,
    school_no VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_tc VARCHAR(255),
    district_en VARCHAR(100),
    district_tc VARCHAR(100),
    address_en TEXT,
    address_tc TEXT,
    tel VARCHAR(50),
    website VARCHAR(500),
    school_type VARCHAR(50) DEFAULT 'Primary School',
    curriculum VARCHAR(100),
    funding_type VARCHAR(100),
    through_train BOOLEAN DEFAULT FALSE,
    language_of_instruction VARCHAR(100),
    student_capacity VARCHAR(50),
    application_page VARCHAR(500),
    has_website BOOLEAN DEFAULT FALSE,
    website_verified BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100) DEFAULT 'Database Import',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_primary_schools_school_no ON public.primary_schools(school_no);
CREATE INDEX IF NOT EXISTS idx_primary_schools_district ON public.primary_schools(district_en);
CREATE INDEX IF NOT EXISTS idx_primary_schools_curriculum ON public.primary_schools(curriculum);
CREATE INDEX IF NOT EXISTS idx_primary_schools_name_en ON public.primary_schools(name_en);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.primary_schools ENABLE ROW LEVEL SECURITY;

-- Allow all users to read primary schools (public data)
CREATE POLICY "Allow public read access to primary schools" ON public.primary_schools
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (for admin purposes)
CREATE POLICY "Allow authenticated users to manage primary schools" ON public.primary_schools
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_primary_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_primary_schools_updated_at
    BEFORE UPDATE ON public.primary_schools
    FOR EACH ROW
    EXECUTE FUNCTION update_primary_schools_updated_at();

-- Insert sample primary schools data
INSERT INTO public.primary_schools (
    school_no, name_en, name_tc, district_en, district_tc,
    address_en, address_tc, tel, website, curriculum,
    funding_type, through_train, language_of_instruction,
    student_capacity, application_page, has_website, website_verified, source
) VALUES 
('PS001', 'St. Paul''s Co-educational College Primary School', '聖保羅男女中學附屬小學', 'Central & Western', '中西區', '33 Macdonnell Road, Mid-Levels, Hong Kong', '香港中環麥當勞道33號', '+852 2525 1234', 'https://www.spccps.edu.hk', '本地課程', '資助', true, '中英文', '720', 'https://www.spccps.edu.hk/admission', true, true, 'Supabase Import'),
('PS002', 'St. Stephen''s Girls'' Primary School', '聖士提反女子中學附屬小學', 'Central & Western', '中西區', '2 Lyttelton Road, Mid-Levels, Hong Kong', '香港中環列堤頓道2號', '+852 2525 1234', 'https://www.ssgps.edu.hk', '本地課程', '資助', true, '中英文', '600', 'https://www.ssgps.edu.hk/admission', true, true, 'Supabase Import'),
('PS003', 'German Swiss International School', '德瑞國際學校', 'Central & Western', '中西區', '11 Peak Road, The Peak, Hong Kong', '香港山頂道11號', '+852 2849 6216', 'https://www.gsis.edu.hk', '國際課程', '私立', false, '德文', '600', 'https://www.gsis.edu.hk/admissions', true, true, 'Supabase Import'),
('PS004', 'Marymount Primary School', '瑪利曼小學', 'Wan Chai', '灣仔區', '10 Blue Pool Road, Happy Valley, Hong Kong', '香港跑馬地藍塘道10號', '+852 2574 1234', 'https://www.mps.edu.hk', '本地課程', '資助', true, '中英文', '600', 'https://www.mps.edu.hk/admission', true, true, 'Supabase Import'),
('PS005', 'French International School', '法國國際學校', 'Wan Chai', '灣仔區', '165 Blue Pool Road, Happy Valley, Hong Kong', '香港跑馬地藍塘道165號', '+852 2577 6217', 'https://www.lfis.edu.hk', '國際課程', '私立', false, '法文', '600', 'https://www.lfis.edu.hk/admissions', true, true, 'Supabase Import')
ON CONFLICT (school_no) DO NOTHING;

-- Verify the table was created
SELECT COUNT(*) as total_primary_schools FROM public.primary_schools; 