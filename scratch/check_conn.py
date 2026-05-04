import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "invoice_app_db")

async def test_conn():
    print(f"Connecting to: {DATABASE_URL} ...")
    try:
        client = AsyncIOMotorClient(DATABASE_URL, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("✅ MongoDB Connection Successful!")
        
        db = client[DATABASE_NAME]
        collections = await db.list_collection_names()
        print(f"✅ Database '{DATABASE_NAME}' is accessible. Collections: {collections}")
        
    except Exception as e:
        print(f"❌ MongoDB Connection Failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_conn())
