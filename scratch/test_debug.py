import requests
import json

BASE_URL = "http://localhost:8000"

def test_list_users():
    # 1. Login
    login_data = {"username": "admin@system.com", "password": "admin123"}
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code != 200:
            print(f"Login failed ({response.status_code}): {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get users
        response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Raw Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Decoded JSON: {json.dumps(data, indent=2)}")
            
    except Exception as e:
        print(f"Script Error: {str(e)}")

if __name__ == "__main__":
    test_list_users()
