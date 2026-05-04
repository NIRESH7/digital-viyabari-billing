import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('invoice_app.db')
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(product)")
        product_cols = [col[1] for col in cursor.fetchall()]
        if 'hsn_sac' not in product_cols:
            print("Adding hsn_sac to product table...")
            cursor.execute("ALTER TABLE product ADD COLUMN hsn_sac VARCHAR")
            
        cursor.execute("PRAGMA table_info(invoiceitem)")
        invoiceitem_cols = [col[1] for col in cursor.fetchall()]
        if 'hsn_sac' not in invoiceitem_cols:
            print("Adding hsn_sac to invoiceitem table...")
            cursor.execute("ALTER TABLE invoiceitem ADD COLUMN hsn_sac VARCHAR")
        if 'product_id' not in invoiceitem_cols:
            print("Adding product_id to invoiceitem table...")
            cursor.execute("ALTER TABLE invoiceitem ADD COLUMN product_id INTEGER REFERENCES product(id)")
            
        cursor.execute("PRAGMA table_info(invoice)")
        invoice_cols = [col[1] for col in cursor.fetchall()]
        if 'payment_mode' not in invoice_cols:
            print("Adding payment_mode to invoice table...")
            cursor.execute("ALTER TABLE invoice ADD COLUMN payment_mode VARCHAR DEFAULT 'CASH'")
        
        conn.commit()
        conn.close()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
