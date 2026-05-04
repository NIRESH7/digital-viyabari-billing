import requests
import json

BASE_URL = "http://localhost:8000"

def test_create_invoice():
    # 1. Login as User 0101 (I'll need to find their email/password or create one)
    # For now, I'll use the Super Admin since they can also create invoices
    login_data = {"username": "admin@system.com", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get a client and a product
    clients = requests.get(f"{BASE_URL}/clients", headers=headers).json()
    products = requests.get(f"{BASE_URL}/products", headers=headers).json()
    
    if not clients or not products:
        print("Need at least one client and one product to test.")
        return
        
    client_id = clients[0]["id"]
    product = products[0]
    
    # 3. Try to create invoice
    invoice_data = {
        "client_id": client_id,
        "invoice_number": "TEST-INV-001",
        "discount": 0,
        "paid_amount": 10,
        "status": "UNPAID",
        "payment_mode": "CASH",
        "items": [
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": 1,
                "price": product["price"],
                "gst_percent": product["gst_percent"]
            }
        ]
    }
    
    print("Sending invoice data...")
    response = requests.post(f"{BASE_URL}/invoices", json=invoice_data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_create_invoice()
