import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_data():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    
    # Fix Invoice Statuses
    res1 = await db["invoices"].update_many({"status": "paid"}, {"$set": {"status": "PAID"}})
    res2 = await db["invoices"].update_many({"status": "unpaid"}, {"$set": {"status": "UNPAID"}})
    res3 = await db["invoices"].update_many({"status": "partial"}, {"$set": {"status": "PARTIAL"}})
    
    print(f"Invoices Updated: PAID({res1.modified_count}), UNPAID({res2.modified_count}), PARTIAL({res3.modified_count})")
    
    # Also check if any roles are lowercase (though they shouldn't be based on my check)
    # But just in case:
    await db["users"].update_many({"role": "SUPER_ADMIN"}, {"$set": {"role": "super_admin"}}) # Models use lowercase
    
    print("MIGRATION FINISHED")

if __name__ == "__main__":
    asyncio.run(migrate_data())
