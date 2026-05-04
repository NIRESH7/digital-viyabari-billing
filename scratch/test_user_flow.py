import requests

BASE_URL = "http://localhost:8000"

def test_full_flow():
    # 1. Login
    login_data = {"username": "user0101@system.com", "password": "password123"}
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Ensure Client exists
    clients = requests.get(f"{BASE_URL}/clients", headers=headers).json()
    if not clients:
        print("Creating Client...")
        requests.post(f"{BASE_URL}/clients", json={
            "name": "Niresh", "mobile": "9876543210", "address": "Coimbatore", "email": "niresh@gmail.com"
        }, headers=headers)
        clients = requests.get(f"{BASE_URL}/clients", headers=headers).json()
    
    # 3. Ensure Product exists
    products = requests.get(f"{BASE_URL}/products", headers=headers).json()
    if not products:
        print("Creating Product...")
        requests.post(f"{BASE_URL}/products", json={
            "name": "Laptop", "price": 50000, "gst_percent": 18, "stock": 10
        }, headers=headers)
        products = requests.get(f"{BASE_URL}/products", headers=headers).json()
    
    # 4. Create Invoice
    invoice_data = {
        "client_id": clients[0]["id"],
        "invoice_number": "INV-TEST-999",
        "items": [{
            "product_id": products[0]["id"],
            "product_name": products[0]["name"],
            "quantity": 1,
            "price": products[0]["price"],
            "gst_percent": products[0]["gst_percent"]
        }]
    }
    print("Saving Invoice...")
    resp = requests.post(f"{BASE_URL}/invoices", json=invoice_data, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_full_flow()
