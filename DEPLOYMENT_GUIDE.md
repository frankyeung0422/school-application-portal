# 🚀 Streamlit Deployment Guide

## Step-by-Step Instructions for GitHub Desktop + Streamlit Cloud

### Step 1: Prepare Your Files ✅
Make sure you have these files in your project folder:
- `streamlit_app.py` ✅
- `requirements.txt` ✅
- `.streamlit/config.toml` ✅
- `backend/scraped_data.json` ✅

### Step 2: Use GitHub Desktop

1. **Open GitHub Desktop**
2. **Clone your repository** (if you haven't already)
   - Click "Clone a repository from the Internet"
   - Select your school portal repository
   - Choose a local folder
   - Click "Clone"

3. **Add your files to the repository folder**
   - Copy all the files above into your cloned repository folder
   - Go back to GitHub Desktop
   - You'll see all files listed as "Changes"

4. **Commit and Push**
   - Add a summary: "Add Streamlit app files"
   - Click "Commit to main"
   - Click "Push origin"

### Step 3: Deploy to Streamlit Cloud

1. **Go to [https://share.streamlit.io](https://share.streamlit.io)**
2. **Sign in with your GitHub account**
3. **Click "New app"**
4. **Configure your app:**
   - **Repository:** Select your repository
   - **Branch:** `main`
   - **Main file path:** `streamlit_app.py`
   - **App URL:** Choose a custom name (optional)
5. **Click "Deploy"**

### Step 4: Wait and Test

- Wait for the build to complete (usually 2-3 minutes)
- Your app will be live at: `https://your-app-name.streamlit.app`
- Test all features to make sure everything works

### Troubleshooting

**If you see dependency errors:**
- Make sure `requirements.txt` is in your repository
- Check that all package versions are compatible

**If data doesn't load:**
- Make sure `backend/scraped_data.json` is in your repository
- Check the file path in the code

**If the app doesn't deploy:**
- Check the deployment logs for specific errors
- Make sure your repository is public (required for free tier)

### Updates

To update your app:
1. Make changes to your files locally
2. Commit and push in GitHub Desktop
3. Streamlit will automatically rebuild your app

---

**That's it! Your Hong Kong School Application Portal will be live on Streamlit Cloud! 🎉** 