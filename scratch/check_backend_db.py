from sqlmodel import Session, create_engine, select
import sys
import os

# Add backend to path so we can import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from models import User

engine = create_engine('sqlite:///backend/invoice_app.db')
with Session(engine) as session:
    users = session.exec(select(User)).all()
    print(f'Users in backend DB: {len(users)}')
    for u in users:
        print(f' - {u.email} ({u.role})')
