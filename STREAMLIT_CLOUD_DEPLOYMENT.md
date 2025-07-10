# 🚀 Streamlit Cloud Deployment with Supabase

## ✅ **Prerequisites Completed:**
- ✅ Supabase project created
- ✅ Database tables created
- ✅ Local testing successful
- ✅ Requirements.txt updated

## 🔧 **Step 1: Configure Streamlit Cloud Secrets**

### **1.1 Access Streamlit Cloud Dashboard**
1. Go to: https://share.streamlit.io/
2. Sign in with your GitHub account
3. Find your `school-application-portal` app

### **1.2 Add Supabase Secrets**
1. Click on your app
2. Click **"Settings"** (gear icon)
3. Scroll down to **"Secrets"**
4. **Replace** the existing content with:

```toml
[SUPABASE]
URL = "https://ilviebfcodaxnfzcpnqi.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsdmllYmZjb2RheG5memNwbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODYwOTcsImV4cCI6MjA2Nzc2MjA5N30.qhN1e0RtzH6vNMOM26qfBM-qfr3rBfGglFROIDAoZhw"
```

### **1.3 Save and Deploy**
1. Click **"Save"**
2. Your app will automatically redeploy

## 🔧 **Step 2: Verify Deployment**

### **2.1 Check App Status**
- Go to your app URL
- Check if it loads without errors
- Look for: `🔗 Using Supabase cloud database.`

### **2.2 Test Login**
Try logging in with:
- **Email**: `frankyeung422@hotmail.com`
- **Password**: `password123`

## 🔧 **Step 3: Troubleshooting**

### **3.1 If App Won't Load**
1. **Check Streamlit Cloud Logs**:
   - Go to your app in Streamlit Cloud
   - Click **"Manage app"**
   - Click **"Logs"**
   - Look for error messages

2. **Common Issues**:
   - **Missing secrets**: Make sure Supabase credentials are in Streamlit Cloud secrets
   - **Import errors**: Check if all requirements are installed
   - **Connection errors**: Verify Supabase is online

### **3.2 If Login Fails**
1. **Check Database Connection**:
   - Look for `🔗 Using Supabase cloud database.` in app output
   - If you see `⚠️ Supabase not available, using local database`, secrets are missing

2. **Verify User Data**:
   - Users should be in Supabase, not local SQLite
   - Check Supabase dashboard: https://supabase.com/dashboard/project/ilviebfcodaxnfzcpnqi

### **3.3 If Secrets Don't Work**
1. **Format Check**:
   - Make sure there are no extra spaces
   - Ensure TOML format is correct
   - Check that URL and ANON_KEY are on separate lines

2. **Redeploy**:
   - After saving secrets, wait for automatic redeploy
   - Or manually trigger redeploy from Streamlit Cloud

## 🔧 **Step 4: Production Checklist**

### **4.1 Before Going Live**
- ✅ Supabase secrets configured in Streamlit Cloud
- ✅ App loads without errors
- ✅ Login works with existing users
- ✅ Registration works for new users
- ✅ All features (applications, profiles, etc.) work

### **4.2 Monitoring**
- **Supabase Dashboard**: Monitor database usage
- **Streamlit Cloud Logs**: Check for errors
- **App Performance**: Monitor response times

## 🎯 **Expected Behavior**

### **✅ Success Indicators:**
1. **App loads** with Supabase connection message
2. **Login works** with existing users
3. **Registration works** for new users
4. **All features** (profiles, applications, etc.) work
5. **Data persists** between sessions

### **❌ Failure Indicators:**
1. **App won't load** - Check logs and secrets
2. **Login fails** - Check database connection
3. **Data doesn't save** - Check Supabase connection
4. **Features broken** - Check database schema

## 🚀 **Your App URL**

Once deployed successfully, your app will be available at:
```
https://school-application-portal-[your-username].streamlit.app
```

## 📞 **Need Help?**

If you're still having issues:

1. **Check Streamlit Cloud Logs** for specific error messages
2. **Verify Supabase Dashboard** - ensure tables exist
3. **Test locally first** - make sure it works on your machine
4. **Check this guide** - ensure all steps are followed

## 🎉 **Success!**

Once everything is working:
- ✅ Your app is live on Streamlit Cloud
- ✅ Using Supabase cloud database
- ✅ All users can register and login
- ✅ Data is safely stored in the cloud
- ✅ No more Google Drive issues!

**Your School Application Portal is now fully deployed and operational!** 🚀 