import requests

BASE_URL = "http://localhost:8000"

def test_create_user():
    # 1. Login to get token
    login_data = {
        "username": "admin@system.com",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Try to create a user
    new_user = {
        "full_name": "Test Admin",
        "email": "testadmin@system.com",
        "password": "password123",
        "role": "admin"
    }
    
    response = requests.post(f"{BASE_URL}/admin/users", json=new_user, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_create_user()
