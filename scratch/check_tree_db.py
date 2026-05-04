import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_tree():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    users = await db["users"].find().to_list(100)
    print(f"TOTAL USERS: {len(users)}")
    for u in users:
        print(f"Name: {u.get('full_name')} | ID: {str(u['_id'])} | Role: {u.get('role')} | CreatedBy: {u.get('created_by_id')}")

asyncio.run(check_tree())
