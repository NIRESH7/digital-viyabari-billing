import sqlite3

def check_users():
    try:
        conn = sqlite3.connect('invoice_app.db')
        cursor = conn.cursor()
        cursor.execute("SELECT email, role, full_name FROM user")
        users = cursor.fetchall()
        print("Existing Users:")
        for user in users:
            print(user)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
