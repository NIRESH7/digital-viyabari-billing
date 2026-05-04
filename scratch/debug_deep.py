import asyncio
import sys
import os
sys.path.append(os.getcwd())

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models import User, Invoice, UserRole
from dotenv import load_dotenv

load_dotenv()

async def debug_check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    await init_beanie(
        database=db,
        document_models=[User, Invoice]
    )
    
    # Check Invoices
    invoices = await Invoice.find_all().to_list()
    print(f"--- INVOICE CHECK ---")
    print(f"Count: {len(invoices)}")
    for inv in invoices:
        print(f"  No: {inv.invoice_number} | Total: {inv.total_amount} | UserID: {inv.user_id}")
    
    # Check Admins
    admins = await User.find(User.role == UserRole.ADMIN).to_list()
    print(f"\n--- ADMIN CHECK ---")
    print(f"Count: {len(admins)}")
    for a in admins:
        print(f"  Name: {a.full_name} | ID: {str(a.id)} | Role: {a.role}")

    # Raw collection check
    raw_users = await db["users"].find({"role": "admin"}).to_list(100)
    print(f"\n--- RAW DB ADMINS ---")
    print(f"Count: {len(raw_users)}")

if __name__ == "__main__":
    asyncio.run(debug_check())
