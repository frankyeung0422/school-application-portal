#!/usr/bin/env python3
"""
Clear Streamlit cache to force reload of primary school data
"""

import streamlit as st

def clear_cache():
    """Clear Streamlit cache"""
    print("Clearing Streamlit cache...")
    
    # Clear all cached data
    st.cache_data.clear()
    
    print("✅ Streamlit cache cleared!")
    print("Now restart your Streamlit app to reload fresh data.")

if __name__ == "__main__":
    clear_cache() 