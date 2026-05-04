import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    invoices = await db["invoices"].find().to_list(100)
    print(f"FOUND {len(invoices)} INVOICES")
    for inv in invoices:
        print(f"Invoice: {inv.get('invoice_number')}")
        items = inv.get('items', [])
        print(f"  Items: {len(items)}")
        for i in items:
            print(f"    - {i.get('product_name')}")

asyncio.run(check())
