#!/usr/bin/env python3
"""
Database Test Script
Tests registration, login, and database operations
"""

import sys
import os
from database import DatabaseManager

def test_database_operations():
    """Test all database operations"""
    print("=== Database Test Script ===")
    
    # Initialize database
    db = DatabaseManager()
    print("✓ Database initialized")
    
    # Test email
    test_email = "frankyeung422@hotmail.com"
    test_password = "testpassword123"
    test_name = "Frank Yeung"
    test_phone = "+852 1234 5678"
    
    print(f"\n--- Testing with email: {test_email} ---")
    
    # Check if user exists
    print("\n1. Checking if user exists...")
    exists = db.user_exists(test_email)
    print(f"   User exists: {exists}")
    
    if exists:
        print("\n2. User already exists, attempting to delete...")
        success = db.reset_user_by_email(test_email)
        print(f"   Delete result: {success}")
        if success:
            exists = db.user_exists(test_email)
            print(f"   User still exists after delete: {exists}")
    
    # Test registration
    print("\n3. Testing registration...")
    success, message = db.register_user(test_name, test_email, test_phone, test_password)
    print(f"   Registration result: {success}")
    print(f"   Message: {message}")
    
    # Verify user exists after registration
    print("\n4. Verifying user exists after registration...")
    exists = db.user_exists(test_email)
    print(f"   User exists: {exists}")
    
    # Test login
    print("\n5. Testing login...")
    login_success, login_message, user_data = db.login_user(test_email, test_password)
    print(f"   Login result: {login_success}")
    print(f"   Message: {login_message}")
    if user_data:
        print(f"   User data: {user_data}")
    
    # Test wrong password
    print("\n6. Testing wrong password...")
    wrong_success, wrong_message, wrong_user = db.login_user(test_email, "wrongpassword")
    print(f"   Wrong password result: {wrong_success}")
    print(f"   Message: {wrong_message}")
    
    # Show all users
    print("\n7. All users in database:")
    all_users = db.get_all_users()
    for user in all_users:
        print(f"   - {user['email']} (ID: {user['id']}, Active: {user['is_active']})")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_database_operations() 