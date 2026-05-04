import sqlite3

def check_data():
    conn = sqlite3.connect('invoice_app.db')
    cursor = conn.cursor()
    
    print("--- INVOICES ---")
    cursor.execute("SELECT id, user_id, invoice_number, total_amount FROM invoice")
    invoices = cursor.fetchall()
    for inv in invoices:
        print(inv)
        
    print("\n--- USERS ---")
    cursor.execute("SELECT id, email, role FROM user")
    users = cursor.fetchall()
    for user in users:
        print(user)
        
    conn.close()

if __name__ == "__main__":
    check_data()
