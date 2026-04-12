import sqlite3

def add_column():
    conn = sqlite3.connect("backend/ventas.db")
    cursor = conn.cursor()
    # Check if column exists
    cursor.execute("PRAGMA table_info(productos)")
    columns = [col[1] for col in cursor.fetchall()]
    if "seller_id" not in columns:
        cursor.execute("ALTER TABLE productos ADD COLUMN seller_id INTEGER")
        print("Column seller_id added successfully")
    else:
        print("Column seller_id already exists")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_column()
