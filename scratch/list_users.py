import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    users = await db["users"].find().to_list(100)
    print("ALL USERS:")
    for u in users:
        print(f"  Name: {u.get('full_name')}, Email: {u.get('email')}, Role: {u.get('role')}, CreatedBy: {u.get('created_by_id')}")

asyncio.run(check())
