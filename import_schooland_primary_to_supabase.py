import os
import json
from datetime import datetime
from glob import glob
from database_supabase import SupabaseDatabaseManager

# Map Schooland.hk fields to Supabase schema
FIELD_MAP = {
    'school_no': 'school_no',
    'name_en': 'name_en',
    'name_tc': 'name_tc',
    'district': 'district_en',
    'address': 'address_en',
    'telephone': 'tel',
    'website': 'website',
    'school_type': 'funding_type',
    'last_updated': 'last_updated',
    'source': 'source',
}

# Additional fields for Supabase schema
EXTRA_FIELDS = {
    'district_tc': '',
    'address_tc': '',
    'curriculum': '',
    'through_train': False,
    'language_of_instruction': '',
    'student_capacity': '',
    'application_page': '',
    'has_website': False,
    'website_verified': False,
    'created_at': None,
    'updated_at': None,
}

def find_latest_json():
    files = glob(os.path.join('scraped_data', 'schooland_primary_schools_*.json'))
    if not files:
        raise FileNotFoundError('No scraped primary school JSON files found.')
    latest = max(files, key=os.path.getmtime)
    return latest

def load_schools(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def map_school(school):
    mapped = {supabase_key: school.get(schooland_key, '') for schooland_key, supabase_key in FIELD_MAP.items()}
    # Fill in extra fields
    for k, v in EXTRA_FIELDS.items():
        mapped[k] = v
    # Set timestamps
    now = datetime.now().isoformat()
    mapped['created_at'] = now
    mapped['updated_at'] = now
    # Set has_website and website_verified if website exists
    if mapped['website']:
        mapped['has_website'] = True
        mapped['website_verified'] = True
    return mapped

def import_to_supabase(schools):
    db = SupabaseDatabaseManager()
    count = 0
    for school in schools:
        mapped = map_school(school)
        try:
            # Upsert by school_no
            result = db.supabase.table('primary_schools').upsert(mapped, on_conflict=['school_no']).execute()
            if result.data:
                count += 1
                print(f"✅ Imported: {mapped['name_en']} ({mapped['school_no']})")
            else:
                print(f"⚠️ No data returned for: {mapped['name_en']} ({mapped['school_no']})")
        except Exception as e:
            print(f"❌ Error importing {mapped['name_en']} ({mapped['school_no']}): {e}")
    print(f"\n🎉 Successfully imported {count} primary schools to Supabase!")

def main():
    print("\n🚀 Importing Schooland.hk scraped primary schools to Supabase...")
    json_path = find_latest_json()
    print(f"Using file: {json_path}")
    schools = load_schools(json_path)
    print(f"Found {len(schools)} schools in JSON.")
    import_to_supabase(schools)
    print("\n✅ Import completed!")

if __name__ == "__main__":
    main() 