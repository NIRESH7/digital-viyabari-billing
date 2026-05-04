import sqlite3

def remove_user(email):
    conn = sqlite3.connect('invoice_app.db')
    cursor = conn.cursor()
    
    try:
        # Find user ID
        cursor.execute("SELECT id FROM user WHERE email = ?", (email,))
        user = cursor.fetchone()
        if not user:
            print(f"User {email} not found")
            return
        
        user_id = user[0]
        print(f"Removing user {email} (ID: {user_id}) and all associated data...")
        
        # 1. Delete InvoiceItems
        cursor.execute("""
            DELETE FROM invoiceitem 
            WHERE invoice_id IN (SELECT id FROM invoice WHERE user_id = ?)
        """, (user_id,))
        print(f"Deleted invoice items: {cursor.rowcount}")
        
        # 2. Delete Invoices
        cursor.execute("DELETE FROM invoice WHERE user_id = ?", (user_id,))
        print(f"Deleted invoices: {cursor.rowcount}")
        
        # 3. Delete Clients
        cursor.execute("DELETE FROM client WHERE user_id = ?", (user_id,))
        print(f"Deleted clients: {cursor.rowcount}")
        
        # 4. Delete Products
        cursor.execute("DELETE FROM product WHERE user_id = ?", (user_id,))
        print(f"Deleted products: {cursor.rowcount}")
        
        # 5. Delete User
        cursor.execute("DELETE FROM user WHERE id = ?", (user_id,))
        print(f"Deleted user record: {cursor.rowcount}")
        
        conn.commit()
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    remove_user("user@system.com")
