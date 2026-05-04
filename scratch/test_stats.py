import requests
import json

BASE_URL = "http://localhost:8000"

def test_dashboard_stats():
    # 1. Login as Super Admin
    login_data = {"username": "admin@system.com", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get dashboard stats
    response = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total Admins: {data.get('total_admins')}")
        print(f"Admins in List: {len(data.get('admins', []))}")
        print(f"First Admin: {data.get('admins')[0] if data.get('admins') else 'None'}")

if __name__ == "__main__":
    test_dashboard_stats()
