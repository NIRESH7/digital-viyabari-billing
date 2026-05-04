import requests

BASE_URL = "http://localhost:8000"

def test_list_users():
    # 1. Login
    login_data = {"username": "admin@system.com", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get users
    response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Users found: {len(response.json())}")
    for u in response.json():
        print(f" - {u['full_name']} ({u['email']})")

if __name__ == "__main__":
    test_list_users()
