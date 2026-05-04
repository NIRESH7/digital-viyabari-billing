import sqlite3

conn = sqlite3.connect("invoice_app.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("TABLES:", tables)

for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM [{t}]")
    count = cursor.fetchone()[0]
    cursor.execute(f"PRAGMA table_info([{t}])")
    cols = cursor.fetchall()
    print(f"\n  Table: {t} ({count} rows)")
    print(f"  Columns: {[c[1] for c in cols]}")

conn.close()
