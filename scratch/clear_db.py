import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import pbkdf2_sha256
from datetime import datetime

MONGO_URL = "mongodb://localhost:27017"
MONGO_DB_NAME = "invoice_app_db"

async def clear_and_seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    
    # Drop all collections
    collections = await db.list_collection_names()
    for col in collections:
        await db.drop_collection(col)
        print(f"Dropped collection: {col}")
    
    # Re-create Super Admin user
    hashed_pw = pbkdf2_sha256.hash("admin123")
    super_admin = {
        "email": "admin@system.com",
        "hashed_password": hashed_pw,
        "full_name": "Super Admin",
        "role": "super_admin",
        "created_by_id": None,
        "created_at": datetime.utcnow()
    }
    result = await db["users"].insert_one(super_admin)
    print(f"\nCreated Super Admin (ID: {result.inserted_id})")
    print(f"  Email: admin@system.com")
    print(f"  Password: admin123")
    
    # Verify
    print(f"\n--- Verification ---")
    for col_name in await db.list_collection_names():
        count = await db[col_name].count_documents({})
        print(f"  {col_name}: {count} documents")
    
    print("\nDatabase cleared and seeded successfully!")

asyncio.run(clear_and_seed())
