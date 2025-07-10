# Supabase Setup Guide for School Application Portal

This guide will help you set up Supabase as your cloud database for the School Application Portal.

## 🚀 Step 1: Create a Supabase Project

1. **Go to [Supabase](https://supabase.com)** and sign up/login
2. **Click "New Project"**
3. **Fill in the details:**
   - Organization: Create new or select existing
   - Project name: `school-application-portal`
   - Database password: Choose a strong password (save this!)
   - Region: Choose closest to you (e.g., `Southeast Asia (Singapore)`)
4. **Click "Create new project"**
5. **Wait for setup to complete** (2-3 minutes)

## 🔑 Step 2: Get Your Supabase Credentials

1. **In your Supabase dashboard**, go to **Settings** → **API**
2. **Copy these values:**
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## 🗄️ Step 3: Create the Database Tables

1. **In Supabase dashboard**, go to **SQL Editor**
2. **Click "New query"**
3. **Paste and run this SQL:**

```sql
-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create child_profiles table
CREATE TABLE child_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    child_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT,
    address TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    child_id BIGINT REFERENCES child_profiles(id),
    school_name TEXT NOT NULL,
    school_type TEXT NOT NULL,
    application_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_tracking table
CREATE TABLE application_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    school_no TEXT NOT NULL,
    school_name TEXT NOT NULL,
    status TEXT DEFAULT 'tracking',
    notes TEXT,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolio_items table
CREATE TABLE portfolio_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    child_id BIGINT REFERENCES child_profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    item_date DATE,
    attachment_path TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personal_statements table
CREATE TABLE personal_statements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    child_id BIGINT REFERENCES child_profiles(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_school TEXT,
    version TEXT DEFAULT '1.0',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_statements ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for now - you can restrict later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on child_profiles" ON child_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on applications" ON applications FOR ALL USING (true);
CREATE POLICY "Allow all operations on application_tracking" ON application_tracking FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on portfolio_items" ON portfolio_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on personal_statements" ON personal_statements FOR ALL USING (true);
```

## 🔧 Step 4: Update Your Streamlit Secrets

1. **Create or edit your `.streamlit/secrets.toml` file** (for local development)
2. **Add your Supabase credentials:**

```toml
[SUPABASE]
URL = "https://your-project-id.supabase.co"
ANON_KEY = "your-anon-key-here"
```

3. **For Streamlit Cloud deployment**, add these secrets in your Streamlit Cloud dashboard:
   - Go to your app settings
   - Add the secrets in the same format as above

## 🚀 Step 5: Install Dependencies

Run this command to install Supabase dependencies:

```bash
pip install supabase psycopg2-binary
```

## 🔄 Step 6: Migrate Your Data

Run the migration script to move your existing users to Supabase:

```bash
python migrate_to_supabase.py
```

## ✅ Step 7: Test the Setup

Test that everything is working:

```bash
python test_supabase_login.py
```

## 🎉 You're Done!

Your School Application Portal is now using Supabase as the cloud database!

### Benefits of Supabase:
- ✅ **Free tier**: 10,000 rows, 500MB database
- ✅ **Real-time capabilities**: Live updates
- ✅ **Built-in authentication**: User management
- ✅ **Automatic backups**: Data safety
- ✅ **SQL interface**: Familiar database operations
- ✅ **API access**: REST and GraphQL APIs

### Next Steps:
1. **Test your app**: Run `streamlit run streamlit_app.py`
2. **Deploy to Streamlit Cloud**: Your app will automatically use Supabase
3. **Monitor usage**: Check your Supabase dashboard for usage stats

### Troubleshooting:
- **Connection issues**: Check your URL and API key
- **Table errors**: Make sure you ran the SQL script
- **Migration issues**: Check that your local database exists

Need help? Check the Supabase documentation or create an issue in your repository! 