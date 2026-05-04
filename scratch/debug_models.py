import asyncio
import sys
import os
sys.path.append(os.getcwd()) # Ensure local models can be found

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models import User, Invoice, UserRole
from dotenv import load_dotenv

load_dotenv()

async def debug_check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client["invoice_app_db"],
        document_models=[User, Invoice]
    )
    
    user_count = await User.count()
    admin_count = await User.find(User.role == UserRole.ADMIN).count()
    invoice_count = await Invoice.count()
    
    print(f"DEBUG - Total Users in DB: {user_count}")
    print(f"DEBUG - Admins found by model: {admin_count}")
    print(f"DEBUG - Invoices found by model: {invoice_count}")
    
    all_users = await User.find_all().to_list()
    for u in all_users:
        print(f"  - {u.full_name} | Role: {u.role} (Type: {type(u.role)})")

if __name__ == "__main__":
    asyncio.run(debug_check())
