-- Create kindergartens table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.kindergartens (
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
    school_type VARCHAR(50) DEFAULT 'Kindergarten',
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
CREATE INDEX IF NOT EXISTS idx_kindergartens_school_no ON public.kindergartens(school_no);
CREATE INDEX IF NOT EXISTS idx_kindergartens_district ON public.kindergartens(district_en);
CREATE INDEX IF NOT EXISTS idx_kindergartens_curriculum ON public.kindergartens(curriculum);
CREATE INDEX IF NOT EXISTS idx_kindergartens_name_en ON public.kindergartens(name_en);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.kindergartens ENABLE ROW LEVEL SECURITY;

-- Allow all users to read kindergartens (public data)
CREATE POLICY "Allow public read access to kindergartens" ON public.kindergartens
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (for admin purposes)
CREATE POLICY "Allow authenticated users to manage kindergartens" ON public.kindergartens
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "Allow service role full access to kindergartens" ON public.kindergartens
    FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kindergartens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kindergartens_updated_at
    BEFORE UPDATE ON public.kindergartens
    FOR EACH ROW
    EXECUTE FUNCTION update_kindergartens_updated_at();

-- Insert sample kindergartens data
INSERT INTO public.kindergartens (
    school_no, name_en, name_tc, district_en, district_tc,
    address_en, address_tc, tel, website, curriculum,
    funding_type, through_train, language_of_instruction,
    student_capacity, application_page, has_website, website_verified, source
) VALUES 
('KG001', 'Victoria Educational Organisation - Victoria (Harbour Heights) Kindergarten', '維多利亞教育機構 - 維多利亞（海峰園）幼稚園', 'Central & Western', '中西區', 'Harbour Heights, Hong Kong', '香港海峰園', '+852 2525 1234', 'https://www.victoria.edu.hk', '本地課程', '私立', true, '中英文', '120', 'https://www.victoria.edu.hk/admission', true, true, 'Supabase Import'),
('KG002', 'St. Catherine''s Kindergarten', '聖嘉勒幼稚園', 'Central & Western', '中西區', 'Mid-Levels, Hong Kong', '香港中環', '+852 2525 1234', 'https://www.stcatherines.edu.hk', '本地課程', '私立', true, '中英文', '120', 'https://www.stcatherines.edu.hk/admission', true, true, 'Supabase Import'),
('KG003', 'Hong Kong International School Kindergarten', '香港國際學校幼稚園', 'Southern', '南區', 'Repulse Bay, Hong Kong', '香港淺水灣', '+852 3149 7000', 'https://www.hkis.edu.hk', '國際課程', '私立', false, '英文', '120', 'https://www.hkis.edu.hk/admissions', true, true, 'Supabase Import'),
('KG004', 'Canadian International School Kindergarten', '加拿大國際學校幼稚園', 'Southern', '南區', 'Aberdeen, Hong Kong', '香港南區黃竹坑', '+852 2525 7088', 'https://www.cdnis.edu.hk', '國際課程', '私立', true, '英文', '120', 'https://www.cdnis.edu.hk/admissions', true, true, 'Supabase Import'),
('KG005', 'Chinese International School Kindergarten', '漢基國際學校幼稚園', 'Eastern', '東區', 'North Point, Hong Kong', '香港北角', '+852 2510 7288', 'https://www.cis.edu.hk', '國際課程', '私立', true, '中英文', '120', 'https://www.cis.edu.hk/admissions', true, true, 'Supabase Import')
ON CONFLICT (school_no) DO NOTHING;

-- Verify the table was created
SELECT COUNT(*) as total_kindergartens FROM public.kindergartens;

-- Show sample data
SELECT school_no, name_en, district_en FROM public.kindergartens ORDER BY school_no LIMIT 5; 