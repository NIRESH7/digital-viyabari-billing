import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    inv = await db["invoices"].find_one()
    if inv:
        print(f"USER_ID: {inv.get('user_id')} | TYPE: {type(inv.get('user_id'))}")
        print(f"CLIENT_ID: {inv.get('client_id')} | TYPE: {type(inv.get('client_id'))}")
    else:
        print("NO INVOICES FOUND")

if __name__ == "__main__":
    asyncio.run(check())
