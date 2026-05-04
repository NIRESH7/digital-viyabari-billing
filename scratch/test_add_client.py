from sqlmodel import Session, create_engine, select
from backend.models import Client, User
from backend.database import engine

def test_add_client():
    with Session(engine) as session:
        user = session.exec(select(User)).first()
        if not user:
            print("No user found")
            return
        
        try:
            client = Client(
                name="Test Client",
                mobile="1234567890",
                address="Test Address",
                user_id=user.id
            )
            session.add(client)
            session.commit()
            print("Successfully added client")
        except Exception as e:
            print(f"Failed to add client: {e}")

if __name__ == "__main__":
    test_add_client()
