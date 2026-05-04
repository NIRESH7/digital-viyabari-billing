import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

async def reset():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invoice_app_db"]
    user = await db["users"].find_one({"full_name": "User 0101"})
    if user:
        new_hash = pwd_context.hash("password123")
        await db["users"].update_one({"_id": user["_id"]}, {"$set": {"hashed_password": new_hash}})
        print(f"Password reset for {user['email']} (ID: {str(user['_id'])})")
    else:
        print("User 0101 not found")

asyncio.run(reset())
