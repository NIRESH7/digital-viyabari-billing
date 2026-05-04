import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    
    # List all collections
    collections = await db.list_collection_names()
    print(f"Collections in 'invoice_app_db': {collections}")
    
    for col_name in collections:
        col = db[col_name]
        count = await col.count_documents({})
        print(f"  {col_name}: {count} documents")
        if count > 0:
            doc = await col.find_one()
            print(f"    Sample: {doc}")
    
    # Also check all databases
    dbs = await client.list_database_names()
    print(f"\nAll MongoDB databases: {dbs}")

asyncio.run(check())
