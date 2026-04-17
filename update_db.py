import sqlite3

def add_columns():
    conn = sqlite3.connect("backend/ventas.db")
    cursor = conn.cursor()
    # Check if columns exist in usuarios
    cursor.execute("PRAGMA table_info(usuarios)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "nickname" not in columns:
        cursor.execute("ALTER TABLE usuarios ADD COLUMN nickname TEXT")
        print("Column nickname added successfully")
    else:
        print("Column nickname already exists")
        
    if "profile_image" not in columns:
        cursor.execute("ALTER TABLE usuarios ADD COLUMN profile_image TEXT")
        print("Column profile_image added successfully")
    else:
        print("Column profile_image already exists")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
