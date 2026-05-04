from typing import List, Optional
from datetime import datetime
from enum import Enum
from beanie import Document, Indexed
from pydantic import Field

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"

class User(Document):
    email: Indexed(str, unique=True)
    hashed_password: str
    full_name: str
    role: UserRole = UserRole.USER
    created_by_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

class Client(Document):
    user_id: str
    name: str
    mobile: str
    email: Optional[str] = None
    address: str
    gst_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "clients"

class Product(Document):
    user_id: str
    name: str
    price: float
    gst_percent: float
    stock: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "products"

from pydantic import BaseModel, Field

class InvoiceStatus(str, Enum):
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    UNPAID = "UNPAID"

class InvoiceItem(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int
    price: float
    gst_percent: float
    hsn_sac: Optional[str] = None

class Invoice(Document):
    user_id: str
    client_id: str
    invoice_number: Indexed(str)
    date: datetime = Field(default_factory=datetime.utcnow)
    sub_total: float = 0.0
    total_gst: float = 0.0
    total_amount: float
    paid_amount: float = 0.0
    discount: float = 0.0
    status: InvoiceStatus = InvoiceStatus.UNPAID
    payment_mode: str = "CASH"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # In MongoDB, we often embed items for performance
    items: List[InvoiceItem] = []

    class Settings:
        name = "invoices"
