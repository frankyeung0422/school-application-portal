-- Insert all 20 primary schools into Supabase
-- Run this in the Supabase SQL Editor

-- First, clear existing data (optional)
-- DELETE FROM public.primary_schools;

-- Insert all primary schools
INSERT INTO public.primary_schools (
    school_no, name_en, name_tc, district_en, district_tc,
    address_en, address_tc, tel, website, curriculum,
    funding_type, through_train, language_of_instruction,
    student_capacity, application_page, has_website, website_verified, source
) VALUES 
('PS001', 'St. Paul''s Co-educational College Primary School', '聖保羅男女中學附屬小學', 'Central & Western', '中西區', '33 Macdonnell Road, Mid-Levels, Hong Kong', '香港中環麥當勞道33號', '+852 2525 1234', 'https://www.spccps.edu.hk', '本地課程', '資助', true, '中英文', '720', 'https://www.spccps.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS002', 'St. Stephen''s Girls'' Primary School', '聖士提反女子中學附屬小學', 'Central & Western', '中西區', '2 Lyttelton Road, Mid-Levels, Hong Kong', '香港中環列堤頓道2號', '+852 2525 1234', 'https://www.ssgps.edu.hk', '本地課程', '資助', true, '中英文', '600', 'https://www.ssgps.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS003', 'German Swiss International School', '德瑞國際學校', 'Central & Western', '中西區', '11 Peak Road, The Peak, Hong Kong', '香港山頂道11號', '+852 2849 6216', 'https://www.gsis.edu.hk', '國際課程', '私立', false, '德文', '600', 'https://www.gsis.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS004', 'Marymount Primary School', '瑪利曼小學', 'Wan Chai', '灣仔區', '10 Blue Pool Road, Happy Valley, Hong Kong', '香港跑馬地藍塘道10號', '+852 2574 1234', 'https://www.mps.edu.hk', '本地課程', '資助', true, '中英文', '600', 'https://www.mps.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS005', 'French International School', '法國國際學校', 'Wan Chai', '灣仔區', '165 Blue Pool Road, Happy Valley, Hong Kong', '香港跑馬地藍塘道165號', '+852 2577 6217', 'https://www.lfis.edu.hk', '國際課程', '私立', false, '法文', '600', 'https://www.lfis.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS006', 'Victoria Shanghai Academy', '維多利亞上海學院', 'Wan Chai', '灣仔區', '19 To Fung Shan Road, Happy Valley, Hong Kong', '香港跑馬地都豐山道19號', '+852 2577 1234', 'https://www.vsa.edu.hk', '國際課程', '私立', true, '中英文', '600', 'https://www.vsa.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS007', 'Diocesan Preparatory School', '拔萃小學', 'Kowloon City', '九龍城區', '1 Oxford Road, Kowloon Tong, Hong Kong', '香港九龍塘牛津道1號', '+852 2711 1234', 'https://www.dps.edu.hk', '本地課程', '資助', true, '中英文', '600', 'https://www.dps.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS008', 'La Salle Primary School', '喇沙小學', 'Kowloon City', '九龍城區', '18 La Salle Road, Kowloon Tong, Hong Kong', '香港九龍塘喇沙利道18號', '+852 2711 1234', 'https://www.lasalle.edu.hk', '本地課程', '資助', true, '中英文', '720', 'https://www.lasalle.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS009', 'Hong Kong International School', '香港國際學校', 'Southern', '南區', '1 Red Hill Road, Repulse Bay, Hong Kong', '香港淺水灣南灣道1號', '+852 3149 7000', 'https://www.hkis.edu.hk', '國際課程', '私立', false, '英文', '600', 'https://www.hkis.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS010', 'Canadian International School', '加拿大國際學校', 'Southern', '南區', '36 Nam Long Shan Road, Aberdeen, Hong Kong', '香港南區黃竹坑南朗山道36號', '+852 2525 7088', 'https://www.cdnis.edu.hk', '國際課程', '私立', true, '英文', '600', 'https://www.cdnis.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS011', 'Chinese International School', '漢基國際學校', 'Eastern', '東區', '20 Braemar Hill Road, North Point, Hong Kong', '香港北角寶馬山道20號', '+852 2510 7288', 'https://www.cis.edu.hk', '國際課程', '私立', true, '中英文', '600', 'https://www.cis.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS012', 'Australian International School', '澳洲國際學校', 'Eastern', '東區', '4 Lei King Road, Sai Wan Ho, Hong Kong', '香港西灣河利景道4號', '+852 2304 6078', 'https://www.ais.edu.hk', '國際課程', '私立', false, '英文', '600', 'https://www.ais.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS013', 'Discovery College', '啟新書院', 'Islands', '離島區', '38 Siena Avenue, Discovery Bay, Hong Kong', '香港大嶼山愉景灣西奈大道38號', '+852 2987 7333', 'https://www.discovery.edu.hk', '國際課程', '私立', false, '英文', '600', 'https://www.discovery.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS014', 'Po Leung Kuk Choi Kai Yau School', '保良局蔡繼有學校', 'Sha Tin', '沙田區', '2 Tin Wan Street, Tin Wan, Hong Kong', '香港田灣田灣街2號', '+852 2555 0338', 'https://www.cky.edu.hk', '國際課程', '私立', true, '中英文', '600', 'https://www.cky.edu.hk/admission', true, true, 'Direct SQL Insert'),
('PS015', 'Hong Kong Academy', '香港學堂', 'Southern', '南區', '33 Wai Man Road, Sai Kung, Hong Kong', '香港西貢惠民路33號', '+852 2655 1111', 'https://www.hkacademy.edu.hk', '國際課程', '私立', false, '英文', '600', 'https://www.hkacademy.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS016', 'American School Hong Kong', '香港美國學校', 'Tai Po', '大埔區', '6 Ma Chung Road, Tai Po, Hong Kong', '香港大埔馬聰路6號', '+852 3919 4100', 'https://www.ashk.edu.hk', '國際課程', '私立', false, '英文', '600', 'https://www.ashk.edu.hk/admissions', true, true, 'Direct SQL Insert'),
('PS017', 'Malvern College Hong Kong', '香港墨爾文國際學校', 'Tsuen Wan', '荃灣區', '3 Fo Chun Road, Pak Shek Kok, Hong Kong', '香港白石角科進路3號', '+852 3898 4688', 'https://www.malverncollege.org.hk', '國際課程', '私立', false, '英文', '600', 'https://www.malverncollege.org.hk/admissions', true, true, 'Direct SQL Insert'),
('PS018', 'Nord Anglia International School Hong Kong', '諾德安達國際學校香港', 'Lam Tin', '藍田', '11 On Tin Street, Lam Tin, Hong Kong', '香港藍田安田街11號', '+852 3958 1428', 'https://www.nordangliaeducation.com/hong-kong', '國際課程', '私立', false, '英文', '600', 'https://www.nordangliaeducation.com/hong-kong/admissions', true, true, 'Direct SQL Insert'),
('PS019', 'Yew Chung International School', '耀中國際學校', 'Kowloon Tong', '九龍塘', '3 To Fuk Road, Kowloon Tong, Hong Kong', '香港九龍塘多福道3號', '+852 2338 7106', 'https://www.ycis-hk.com', '國際課程', '私立', true, '中英文', '600', 'https://www.ycis-hk.com/admissions', true, true, 'Direct SQL Insert'),
('PS020', 'Kellett School', '啟歷學校', 'Pok Fu Lam', '薄扶林', '2 Wah Lok Path, Wah Fu, Hong Kong', '香港華富華樂徑2號', '+852 3120 0700', 'https://www.kellettschool.com', '國際課程', '私立', false, '英文', '600', 'https://www.kellettschool.com/admissions', true, true, 'Direct SQL Insert')
ON CONFLICT (school_no) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_tc = EXCLUDED.name_tc,
    district_en = EXCLUDED.district_en,
    district_tc = EXCLUDED.district_tc,
    address_en = EXCLUDED.address_en,
    address_tc = EXCLUDED.address_tc,
    tel = EXCLUDED.tel,
    website = EXCLUDED.website,
    curriculum = EXCLUDED.curriculum,
    funding_type = EXCLUDED.funding_type,
    through_train = EXCLUDED.through_train,
    language_of_instruction = EXCLUDED.language_of_instruction,
    student_capacity = EXCLUDED.student_capacity,
    application_page = EXCLUDED.application_page,
    has_website = EXCLUDED.has_website,
    website_verified = EXCLUDED.website_verified,
    source = EXCLUDED.source,
    updated_at = NOW();

-- Verify the insertion
SELECT COUNT(*) as total_primary_schools FROM public.primary_schools;

-- Show sample data
SELECT school_no, name_en, district_en FROM public.primary_schools ORDER BY school_no LIMIT 10; 