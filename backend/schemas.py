from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from models import UserRole, InvoiceStatus

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.USER

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ClientCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[EmailStr] = None
    address: str
    gst_number: Optional[str] = None

class ClientOut(BaseModel):
    id: str
    name: str
    mobile: str
    email: Optional[str] = None
    address: str
    gst_number: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    price: float
    gst_percent: float
    stock: int = 0
    hsn_sac: Optional[str] = None

class ProductOut(BaseModel):
    id: str
    name: str
    price: float
    gst_percent: float
    stock: int
    created_at: datetime
    class Config:
        from_attributes = True

class InvoiceItemCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int
    price: float
    gst_percent: float
    hsn_sac: Optional[str] = None

class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: str
    discount: float = Field(default=0.0)
    paid_amount: float = 0.0
    status: InvoiceStatus = InvoiceStatus.UNPAID
    payment_mode: str = "CASH"
    items: List[InvoiceItemCreate]
