import requests

BASE_URL = "http://localhost:8000"

# 1. Login to get token
login_data = {"username": "user01@system.com", "password": "password123"}
res = requests.post(f"{BASE_URL}/auth/login", data=login_data)
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Try to create invoice
invoice_data = {
    "client_id": "69f8be7e7af48c8b7e37384a", # Example from DB check
    "invoice_number": "INV-TEST-1234",
    "discount": 0,
    "paid_amount": 0,
    "status": "UNPAID",
    "payment_mode": "CASH",
    "items": [
        {
            "product_name": "Test Product",
            "quantity": 1,
            "price": 100.0,
            "gst_percent": 18.0
        }
    ]
}

res = requests.post(f"{BASE_URL}/invoices", json=invoice_data, headers=headers)
print(f"Status: {res.status_code}")
print(f"Response: {res.text}")
