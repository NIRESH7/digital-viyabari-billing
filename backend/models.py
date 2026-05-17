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

class Company(Document):
    user_id: Indexed(str, unique=True)
    name: str = "My Company"
    address: str = "My Address"
    gst_number: Optional[str] = None
    mobile: str = "0000000000"
    email: Optional[str] = None
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    ifsc: Optional[str] = None
    account_type: Optional[str] = "Current"
    account_holder_name: Optional[str] = None
    signature_url: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#2563eb"
    secondary_color: Optional[str] = "#ffffff"

    class Settings:
        name = "company_details"

class Client(Document):
    user_id: str
    company_name: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None  # This will be used as billing address
    shipping_address: Optional[str] = None
    gst_number: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "clients"

class Product(Document):
    user_id: str
    name: str
    category: Optional[str] = None
    unit: str = "Units"
    hsn_code: Optional[str] = None
    price: float
    tax_type: str = "without_tax" # "with_tax" or "without_tax"
    discount_value: float = 0.0
    discount_type: str = "percentage"  # "percentage" or "amount"
    gst_percent: float
    stock: int = 0
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "products"

from pydantic import BaseModel, Field

class InvoiceStatus(str, Enum):
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    UNPAID = "UNPAID"
    DRAFT = "DRAFT"

class InvoiceItem(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int
    price: float
    discount_value: float = 0.0
    discount_type: str = "percentage"
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
    discount_value: float = 0.0
    discount_type: str = "percentage"
    status: InvoiceStatus = InvoiceStatus.UNPAID
    payment_mode: str = "CASH"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # In MongoDB, we often embed items for performance
    items: List[InvoiceItem] = []

    class Settings:
        name = "invoices"
