# Hong Kong School Application Portal - Streamlit Version

A comprehensive Streamlit application for browsing and managing kindergarten applications in Hong Kong.

## 🚀 Features

- **🏫 Kindergarten Database**: Access information about hundreds of kindergartens across Hong Kong
- **🔍 Advanced Search**: Filter schools by district, name, or other criteria
- **📊 Analytics Dashboard**: Visual insights and statistics about schools
- **👤 User Profiles**: Save favorite schools and track applications
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **🌐 Multi-language Support**: English and Chinese interfaces

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup Instructions

1. **Clone or download the project files**
   ```bash
   # Make sure you have the following files:
   # - streamlit_app.py
   # - requirements.txt
   # - .streamlit/config.toml
   # - backend/scraped_data.json (kindergarten data)
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application locally**
   ```bash
   streamlit run streamlit_app.py
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:8501`
   - The application will automatically load with the kindergarten data

## 📁 Project Structure

```
school-application-portal/
├── streamlit_app.py          # Main Streamlit application
├── requirements.txt          # Python dependencies
├── .streamlit/
│   └── config.toml          # Streamlit configuration
├── backend/
│   └── scraped_data.json    # Kindergarten data (if available)
└── STREAMLIT_README.md      # This file
```

## 🚀 Deployment to Streamlit Community Cloud

### Step 1: Prepare Your Repository

1. **Create a GitHub repository** (if you don't have one)
2. **Upload your files** to the repository:
   - `streamlit_app.py`
   - `requirements.txt`
   - `.streamlit/config.toml`
   - `backend/scraped_data.json` (if you have the data)

### Step 2: Deploy to Streamlit Cloud

1. **Go to [share.streamlit.io](https://share.streamlit.io)**
2. **Sign in with your GitHub account**
3. **Click "New app"**
4. **Configure your app**:
   - **Repository**: Select your GitHub repository
   - **Branch**: `main` (or your default branch)
   - **Main file path**: `streamlit_app.py`
   - **App URL**: Choose a custom URL (optional)

5. **Click "Deploy"**

### Step 3: Access Your Deployed App

- Your app will be available at `https://your-app-name.streamlit.app`
- Streamlit will automatically rebuild your app when you push changes to your repository

## 📊 Data Sources

The application uses kindergarten data from:
- Hong Kong Education Bureau
- Official school websites
- Government databases

## 🔧 Configuration

### Customizing the App

You can modify the following files to customize the application:

- **`streamlit_app.py`**: Main application logic and UI
- **`.streamlit/config.toml`**: Streamlit appearance and settings
- **`requirements.txt`**: Python package dependencies

### Adding New Features

To add new features:

1. **Modify `streamlit_app.py`** to add new pages or functionality
2. **Update `requirements.txt`** if you need additional packages
3. **Test locally** with `streamlit run streamlit_app.py`
4. **Deploy** by pushing changes to your GitHub repository

## 🎨 Customization Options

### Changing Colors and Theme

Edit `.streamlit/config.toml`:
```toml
[theme]
primaryColor = "#your-color"
backgroundColor = "#your-bg-color"
secondaryBackgroundColor = "#your-secondary-bg"
textColor = "#your-text-color"
```

### Adding New Pages

In `streamlit_app.py`, add new page functions and update the navigation:
```python
def new_page():
    st.markdown('<h1 class="main-header">New Page</h1>', unsafe_allow_html=True)
    # Your page content here

# Update the navigation options
options=["🏠 Home", "🏫 Kindergartens", "📊 Analytics", "👤 Profile", "ℹ️ About", "🆕 New Page"]
```

## 🔍 Troubleshooting

### Common Issues

1. **Data not loading**
   - Ensure `backend/scraped_data.json` exists and is valid JSON
   - Check file permissions

2. **Dependencies not installing**
   - Update pip: `pip install --upgrade pip`
   - Install packages individually: `pip install streamlit pandas plotly`

3. **App not deploying on Streamlit Cloud**
   - Check that all required files are in your repository
   - Verify the main file path is correct
   - Check the deployment logs for errors

### Getting Help

- **Streamlit Documentation**: [docs.streamlit.io](https://docs.streamlit.io)
- **Streamlit Community**: [discuss.streamlit.io](https://discuss.streamlit.io)
- **GitHub Issues**: Create an issue in your repository

## 📈 Performance Tips

1. **Use caching** for expensive operations:
   ```python
   @st.cache_data
   def expensive_function():
       # Your expensive operation here
       pass
   ```

2. **Optimize data loading** by loading data once and reusing it

3. **Use appropriate data structures** (pandas DataFrames for tabular data)

## 🔒 Security Considerations

- The application runs in a sandboxed environment on Streamlit Cloud
- No sensitive data is stored locally
- User sessions are temporary and don't persist between sessions

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

---

**Happy coding! 🚀** 