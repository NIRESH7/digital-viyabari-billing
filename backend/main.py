from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Optional
from datetime import datetime, timedelta
import io

from database import init_db
from models import (
    User, UserRole, Client, Product, Invoice, InvoiceItem, InvoiceStatus, Company
)
from schemas import (
    UserCreate, UserOut, ClientCreate, ClientOut, ProductCreate, ProductOut, InvoiceCreate, CompanyCreate, CompanyOut
)
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, check_role
)
from pdf_gen import generate_invoice_pdf
from contextlib import asynccontextmanager
import os
import shutil
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB and Beanie
    await init_db()
    
    # Create default Super Admin if not exists
    admin_exists = await User.find_one(User.role == UserRole.SUPER_ADMIN)
    if not admin_exists:
        super_admin = User(
            email="admin@system.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Super Admin",
            role=UserRole.SUPER_ADMIN
        )
        await super_admin.insert()
    yield

app = FastAPI(title="Pro Invoice SaaS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Helper to get ancestor IDs
async def get_ancestors(user: User) -> List[str]:
    ids = [str(user.id)]
    current = user
    while current.created_by_id:
        parent = await User.get(current.created_by_id)
        if not parent: break
        ids.append(str(parent.id))
        current = parent
    return ids

# --- AUTH ---
@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await User.find_one(User.email == form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    # Ensure user has a string ID in the response
    user_data = user.dict()
    user_data["id"] = str(user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user_data}

@app.get("/auth/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at
    }

# --- ADMIN MANAGEMENT ---
@app.post("/admin/users", response_model=UserOut)
async def create_managed_user(
    user_in: UserCreate, 
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    try:
        if current_user.role == UserRole.SUPER_ADMIN and user_in.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Super Admins can only create managers (Admins)")
        
        if current_user.role == UserRole.ADMIN and user_in.role != UserRole.USER:
            raise HTTPException(status_code=403, detail="Managers can only create employees (Users)")
        
        existing = await User.find_one(User.email == user_in.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        new_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            role=user_in.role,
            created_by_id=str(current_user.id)
        )
        await new_user.insert()
        
        # Manually construct return to avoid Pydantic ObjectId issues
        return {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "created_at": new_user.created_at
        }
    except Exception as e:
        print(f"ERROR CREATING USER: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/admin/users", response_model=List[UserOut])
async def list_managed_users(
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    try:
        if current_user.role == UserRole.SUPER_ADMIN:
            users = await User.find(User.role == UserRole.ADMIN).to_list()
        else:
            users = await User.find(User.created_by_id == str(current_user.id), User.role == UserRole.USER).to_list()
        
        # Manually format each user to ensure 'id' is a string
        return [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "created_at": u.created_at
            } for u in users
        ]
    except Exception as e:
        print(f"ERROR LISTING USERS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/users/{user_id}")
async def delete_managed_user(
    user_id: str,
    current_user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    target_user = await User.get(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        if target_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Super Admins can only remove Admins")
    
    if current_user.role == UserRole.ADMIN:
        if target_user.role != UserRole.USER or target_user.created_by_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Managers can only remove their own Employees")
    
    # Cascade delete in MongoDB
    if target_user.role == UserRole.ADMIN:
        subordinates = await User.find(User.created_by_id == str(target_user.id)).to_list()
        for sub in subordinates:
            await Invoice.find(Invoice.user_id == str(sub.id)).delete()
            await Client.find(Client.user_id == str(sub.id)).delete()
            await Product.find(Product.user_id == str(sub.id)).delete()
            await sub.delete()
    
    await Invoice.find(Invoice.user_id == user_id).delete()
    await Client.find(Client.user_id == user_id).delete()
    await Product.find(Product.user_id == user_id).delete()
    await target_user.delete()
    
    return {"detail": "User removed successfully"}

# --- COMPANY SETTINGS ---
@app.get("/company", response_model=Optional[CompanyOut])
async def get_company_details(user: User = Depends(get_current_user)):
    company = await Company.find_one(Company.user_id == str(user.id))
    if company and company.signature_url:
        if not company.signature_url.startswith("http"):
            filename = os.path.basename(company.signature_url)
            company.signature_url = f"http://localhost:8000/uploads/{filename}"
    return company

@app.post("/company", response_model=CompanyOut)
async def save_company_details(company_in: CompanyCreate, user: User = Depends(get_current_user)):
    try:
        data = company_in.dict()
        # Clean data: remove IDs and handle empty strings
        clean_data = {k: (v if v != "" else None) for k, v in data.items() if k not in ['id', 'user_id', '_id']}
        
        uid = str(user.id)
        company = await Company.find_one({"user_id": uid})
        
        if not company:
            company = Company(user_id=uid)
            await company.insert()
            
        # Update fields
        for k, v in clean_data.items():
            if hasattr(company, k):
                setattr(company, k, v)
        
        await company.save()
        return company
            
    except Exception as e:
        print(f"ERROR SAVING COMPANY: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/company/logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    try:
        os.makedirs("uploads/logos", exist_ok=True)
        file_path = f"uploads/logos/{user.id}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        url = f"http://localhost:8000/{file_path}"
        company = await Company.find_one(Company.user_id == str(user.id))
        if company:
            company.logo_url = url
            await company.save()
        else:
            company = Company(user_id=str(user.id), logo_url=url)
            await company.create()
            
        return {"logo_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/company/signature")
async def upload_signature(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    try:
        ext = file.filename.split(".")[-1]
        filename = f"sig_{user.id}.{ext}"
        filepath = os.path.join("uploads", filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        company = await Company.find_one(Company.user_id == str(user.id))
        if not company:
            company = Company(user_id=str(user.id), name="My Company", address="My Address", mobile="0000000000")
            await company.insert()
            
        company.signature_url = filepath
        await company.save()
        
        # Return full URL for frontend
        return {"signature_url": f"http://localhost:8000/uploads/{filename}"}
    except Exception as e:
        print(f"UPLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- CLIENTS ---
def format_client_out(c: Client) -> dict:
    return {
        "id": str(c.id),
        "company_name": c.company_name or c.name or "Unknown Customer",
        "contact_person": c.contact_person or "",
        "mobile": c.mobile or "N/A",
        "whatsapp": c.whatsapp or "",
        "email": c.email or "",
        "address": c.address or "N/A",
        "shipping_address": c.shipping_address or "",
        "gst_number": c.gst_number or "",
        "state": c.state or "N/A",
        "created_at": c.created_at
    }

@app.post("/clients", response_model=ClientOut)
async def create_client(
    client_in: ClientCreate, 
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    try:
        new_client = Client(**client_in.dict(), user_id=str(user.id))
        await new_client.insert()
        return format_client_out(new_client)
    except Exception as e:
        print(f"ERROR CREATING CLIENT: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def check_same_org(user_id_1: str, user_id_2: str) -> bool:
    if user_id_1 == user_id_2:
        return True
    u1 = await User.get(user_id_1)
    u2 = await User.get(user_id_2)
    if not u1 or not u2:
        return False
    admin1 = str(u1.id) if u1.role == UserRole.ADMIN else (u1.created_by_id or str(u1.id))
    admin2 = str(u2.id) if u2.role == UserRole.ADMIN else (u2.created_by_id or str(u2.id))
    return admin1 == admin2

@app.get("/clients", response_model=List[ClientOut])
async def get_clients(user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))):
    if user.role == UserRole.SUPER_ADMIN:
        clients = await Client.find_all().to_list()
    else:
        admin_id = str(user.id) if user.role == UserRole.ADMIN else (user.created_by_id or str(user.id))
        sub_users = await User.find(User.created_by_id == admin_id).to_list()
        all_involved_ids = [admin_id] + [str(u.id) for u in sub_users]
        from beanie.operators import In
        clients = await Client.find(In(Client.user_id, all_involved_ids)).to_list()
    return [format_client_out(c) for c in clients]

@app.put("/clients/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    client_in: ClientCreate,
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    client = await Client.get(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    is_authorized = False
    if user.role == UserRole.SUPER_ADMIN:
        is_authorized = True
    else:
        is_authorized = await check_same_org(str(user.id), client.user_id)
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in client_in.dict().items():
        setattr(client, key, value)
    await client.save()
    return format_client_out(client)

@app.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    client = await Client.get(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    is_authorized = False
    if user.role == UserRole.SUPER_ADMIN:
        is_authorized = True
    else:
        is_authorized = await check_same_org(str(user.id), client.user_id)
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await client.delete()
    return {"message": "Client deleted"}

# --- PRODUCTS ---
@app.post("/products", response_model=ProductOut)
async def create_product(
    product_in: ProductCreate, 
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    try:
        new_product = Product(**product_in.dict(), user_id=str(user.id))
        await new_product.insert()
        return {
            "id": str(new_product.id),
            **new_product.dict(exclude={"id", "user_id"})
        }
    except Exception as e:
        print(f"ERROR CREATING PRODUCT: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/products", response_model=List[ProductOut])
async def get_products(user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))):
    if user.role == UserRole.SUPER_ADMIN:
        products = await Product.find_all().to_list()
    else:
        admin_id = str(user.id) if user.role == UserRole.ADMIN else (user.created_by_id or str(user.id))
        sub_users = await User.find(User.created_by_id == admin_id).to_list()
        all_involved_ids = [admin_id] + [str(u.id) for u in sub_users]
        from beanie.operators import In
        products = await Product.find(In(Product.user_id, all_involved_ids)).to_list()
    return [
        {
            "id": str(p.id),
            **p.dict(exclude={"id", "user_id"})
        } for p in products
    ]

@app.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    product_in: ProductCreate,
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    product = await Product.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    is_authorized = False
    if user.role == UserRole.SUPER_ADMIN:
        is_authorized = True
    else:
        is_authorized = await check_same_org(str(user.id), product.user_id)
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in product_in.dict().items():
        setattr(product, key, value)
    await product.save()
    return {"id": str(product.id), **product.dict(exclude={"id", "user_id"})}

@app.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    product = await Product.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    is_authorized = False
    if user.role == UserRole.SUPER_ADMIN:
        is_authorized = True
    else:
        is_authorized = await check_same_org(str(user.id), product.user_id)
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await product.delete()
    return {"message": "Product deleted"}

# --- INVOICES ---
@app.get("/invoices/next-number")
async def get_next_invoice_number(user: User = Depends(get_current_user)):
    try:
        invoices = await Invoice.find(Invoice.user_id == str(user.id)).to_list()
        max_num = 0
        for inv in invoices:
            num_str = inv.invoice_number
            if num_str.startswith("INV-"):
                num_part = num_str[4:]
            else:
                num_part = "".join(c for c in num_str if c.isdigit())
            
            if num_part.isdigit():
                try:
                    val = int(num_part)
                    if val > max_num:
                        max_num = val
                except ValueError:
                    pass
        return {"next_invoice_number": f"INV-{max_num + 1}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/invoices")
async def create_invoice(
    invoice_in: InvoiceCreate, 
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    try:
        existing = await Invoice.find_one(Invoice.user_id == str(user.id), Invoice.invoice_number == invoice_in.invoice_number)
        if existing:
            raise HTTPException(status_code=400, detail="Invoice number already exists")

        sub_total = 0
        total_gst = 0
        items_to_save = []
        
        for item in invoice_in.items:
            # Line item calculations
            qty = item.quantity or 0
            price = item.price or 0
            line_subtotal_before_discount = price * qty
            
            # Line item discount
            line_discount = 0
            if item.discount_type == "percentage":
                line_discount = (line_subtotal_before_discount * (item.discount_value or 0)) / 100
            else:
                line_discount = (item.discount_value or 0)
            
            line_taxable_value = line_subtotal_before_discount - line_discount
            line_gst = (line_taxable_value * (item.gst_percent or 0)) / 100
            
            sub_total += line_taxable_value
            total_gst += line_gst
            
            if item.product_id:
                db_product = await Product.get(item.product_id)
                if db_product:
                    db_product.stock -= (item.quantity or 0)
                    await db_product.save()
            
            items_to_save.append(InvoiceItem(**item.dict()))

        # Final Invoice Discount
        invoice_discount_amount = 0
        if invoice_in.discount_type == "percentage":
            invoice_discount_amount = (sub_total * (invoice_in.discount_value or 0)) / 100
        else:
            invoice_discount_amount = (invoice_in.discount_value or 0)

        final_amount = sub_total + total_gst - invoice_discount_amount
        
        new_invoice = Invoice(
            user_id=str(user.id),
            client_id=invoice_in.client_id,
            invoice_number=invoice_in.invoice_number,
            sub_total=sub_total,
            total_gst=total_gst,
            total_amount=final_amount,
            paid_amount=invoice_in.paid_amount or 0,
            discount_value=invoice_in.discount_value or 0,
            discount_type=invoice_in.discount_type,
            status=invoice_in.status.upper(),
            payment_mode=invoice_in.payment_mode,
            items=items_to_save
        )
        await new_invoice.insert()
        
        print(f"SUCCESS: Invoice {new_invoice.invoice_number} created with ID {new_invoice.id}")

        return {
            "id": str(new_invoice.id),
            "invoice_number": new_invoice.invoice_number,
            "total_amount": new_invoice.total_amount,
            "status": new_invoice.status
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"ERROR CREATING INVOICE:\n{tb}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Invoice Creation Failed: {str(e)}")

@app.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice_in: InvoiceCreate,
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    try:
        invoice = await Invoice.get(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        is_authorized = False
        if user.role == UserRole.SUPER_ADMIN:
            is_authorized = True
        else:
            is_authorized = await check_same_org(str(user.id), invoice.user_id)
            
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Not authorized to edit this invoice")

        # 1. Restore previous product stocks
        for old_item in invoice.items:
            if old_item.product_id:
                db_prod = await Product.get(old_item.product_id)
                if db_prod:
                    db_prod.stock += (old_item.quantity or 0)
                    await db_prod.save()

        # 2. Process and update line items + update stocks
        sub_total = 0
        total_gst = 0
        items_to_save = []
        
        for item in invoice_in.items:
            qty = item.quantity or 0
            price = item.price or 0
            line_subtotal_before_discount = price * qty
            
            line_discount = 0
            if item.discount_type == "percentage":
                line_discount = (line_subtotal_before_discount * (item.discount_value or 0)) / 100
            else:
                line_discount = (item.discount_value or 0)
            
            line_taxable_value = line_subtotal_before_discount - line_discount
            line_gst = (line_taxable_value * (item.gst_percent or 0)) / 100
            
            sub_total += line_taxable_value
            total_gst += line_gst
            
            if item.product_id:
                db_product = await Product.get(item.product_id)
                if db_product:
                    db_product.stock -= (item.quantity or 0)
                    await db_product.save()
            
            items_to_save.append(InvoiceItem(**item.dict()))

        # 3. Final Invoice Discount
        invoice_discount_amount = 0
        if invoice_in.discount_type == "percentage":
            invoice_discount_amount = (sub_total * (invoice_in.discount_value or 0)) / 100
        else:
            invoice_discount_amount = (invoice_in.discount_value or 0)

        final_amount = sub_total + total_gst - invoice_discount_amount
        
        # 4. Save updates
        invoice.client_id = invoice_in.client_id
        invoice.invoice_number = invoice_in.invoice_number
        invoice.sub_total = sub_total
        invoice.total_gst = total_gst
        invoice.total_amount = final_amount
        invoice.paid_amount = invoice_in.paid_amount or 0
        invoice.discount_value = invoice_in.discount_value or 0
        invoice.discount_type = invoice_in.discount_type
        invoice.status = invoice_in.status.upper()
        invoice.payment_mode = invoice_in.payment_mode
        invoice.items = items_to_save
        
        await invoice.save()
        
        print(f"SUCCESS: Invoice {invoice.invoice_number} updated with ID {invoice.id}")

        return {
            "id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "total_amount": invoice.total_amount,
            "status": invoice.status
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"ERROR UPDATING INVOICE:\n{tb}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Invoice Update Failed: {str(e)}")

@app.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    status_in: dict,
    user: User = Depends(get_current_user)
):
    invoice = await Invoice.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    can_update = False
    if user.role == UserRole.SUPER_ADMIN:
        can_update = True
    elif user.role == UserRole.ADMIN:
        creator = await User.get(invoice.user_id)
        if str(creator.id) == str(user.id) or creator.created_by_id == str(user.id):
            can_update = True
    elif user.role == UserRole.USER:
        if invoice.user_id == str(user.id):
            can_update = True
            
    if not can_update:
        raise HTTPException(status_code=403, detail="Not authorized to update this invoice")
        
    new_status = status_in.get("status", "").upper()
    invoice.status = new_status
    await invoice.save()
    return {"detail": "Status updated"}

@app.get("/invoices")
async def get_invoices(user: User = Depends(get_current_user)):
    try:
        if user.role == UserRole.SUPER_ADMIN:
            invoices = await Invoice.find_all().to_list()
        elif user.role == UserRole.ADMIN:
            descendant_ids = await get_all_descendants(str(user.id))
            all_involved_ids = [str(user.id)] + descendant_ids
            from beanie.operators import In
            invoices = await Invoice.find(In(Invoice.user_id, all_involved_ids)).to_list()
        else:
            invoices = await Invoice.find(Invoice.user_id == str(user.id)).to_list()
            
        results = []
        for inv in invoices:
            # Fetch creator info for display
            creator = await User.get(inv.user_id)
            results.append({
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "client_id": inv.client_id,
                "date": inv.date,
                "total_amount": inv.total_amount,
                "paid_amount": inv.paid_amount,
                "discount_value": inv.discount_value,
                "discount_type": inv.discount_type,
                "status": inv.status,
                "payment_mode": inv.payment_mode,
                "user_full_name": creator.full_name if creator else "Unknown",
                "user_role": creator.role if creator else "user",
                "user_id": inv.user_id,
                "items": [item.dict() for item in inv.items]
            })
        return results
    except Exception as e:
        print(f"ERROR FETCHING INVOICES: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/invoices/{invoice_id}/pdf")
async def get_pdf(
    invoice_id: str,
    user: User = Depends(get_current_user)
):
    try:
        invoice = await Invoice.get(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        creator = await User.get(invoice.user_id)
        
        # Authorization
        can_access = False
        if user.role == UserRole.SUPER_ADMIN:
            can_access = True
        elif user.role == UserRole.ADMIN:
            if creator and (str(creator.id) == str(user.id) or creator.created_by_id == str(user.id)):
                can_access = True
        elif user.role == UserRole.USER:
            if invoice.user_id == str(user.id):
                can_access = True
                
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to access this invoice")

        # Fetch saved company details, fallback to basic user info
        saved_company = await Company.find_one(Company.user_id == str(invoice.user_id))
        
        if saved_company:
            business_details = {
                "name": saved_company.name,
                "address": saved_company.address,
                "email": saved_company.email or user.email,
                "phone": saved_company.mobile,
                "gst": saved_company.gst_number,
                "signature_url": saved_company.signature_url,
                "bank": {
                    "bank_name": saved_company.bank_name or "N/A",
                    "account_no": saved_company.account_no or "N/A",
                    "ifsc": saved_company.ifsc or "N/A",
                    "account_type": saved_company.account_type or "Current",
                    "account_holder_name": saved_company.account_holder_name or saved_company.name
                }
            }
        else:
            business_details = {
                "name": (creator.full_name if creator else user.full_name) + " Business",
                "address": "123 Business Plaza, City, India",
                "email": creator.email if creator else user.email,
                "phone": "+91 9876543210",
                "gst": "33AABCA1234A1Z1",
                "bank": {
                    "bank_name": "City Union Bank Limited",
                    "account_no": "500101011467177",
                    "ifsc": "CIUB0000524",
                    "account_type": "Current",
                    "account_holder_name": creator.full_name if creator else user.full_name
                }
            }
        
        client = await Client.get(invoice.client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        from pdf_gen import generate_invoice_pdf
        pdf_buffer = generate_invoice_pdf(invoice, client, business_details)
        pdf_buffer.seek(0)
        
        return Response(
            content=pdf_buffer.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=INV_{invoice.invoice_number}.pdf"}
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        error_msg = f"ERROR GENERATING PDF: {str(e)}\n{tb}"
        print(error_msg)
        with open("error_log.txt", "a") as f:
            import datetime
            f.write(f"[{datetime.datetime.now()}] {error_msg}\n")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")

# --- DASHBOARD ---
async def get_all_descendants(user_id: str) -> List[str]:
    descendants = []
    children = await User.find(User.created_by_id == user_id).to_list()
    for child in children:
        descendants.append(str(child.id))
        descendants.extend(await get_all_descendants(str(child.id)))
    return descendants

@app.get("/dashboard/stats")
async def get_stats(
    target_user_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    # --- FETCHING DATA FOR A SPECIFIC USER (Performance View) ---
    if target_user_id:
        target = await User.get(target_user_id)
        if not target: 
            raise HTTPException(status_code=404, detail="User not found")
        
        # Security: Admins can only see their own subordinates
        if user.role == UserRole.ADMIN:
            if target.created_by_id != str(user.id) and str(target.id) != str(user.id):
                raise HTTPException(status_code=403, detail="Not authorized to view this user")
        
        descendant_ids = await get_all_descendants(str(target.id))
        all_involved_ids = [str(target.id)] + descendant_ids
        
        from beanie.operators import In
        invoices = await Invoice.find(In(Invoice.user_id, all_involved_ids)).to_list()
        
        formatted_invoices = []
        for inv in invoices:
            formatted_invoices.append({
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "total_amount": inv.total_amount,
                "payment_mode": inv.payment_mode,
                "created_at": inv.created_at
            })

        return {
            "target_name": target.full_name,
            "total_sales": sum((inv.paid_amount or 0) for inv in invoices),
            "total_invoices": len(invoices),
            "managed_users_count": len(descendant_ids),
            "invoices": formatted_invoices[:20]
        }

    # --- MAIN DASHBOARD VIEWS ---
    
    # 1. Super Admin Stats
    if user.role == UserRole.SUPER_ADMIN:
        try:
            all_invoices = await Invoice.find_all().to_list()
            admins = await User.find(User.role == UserRole.ADMIN).to_list()
            return {
                "total_sales": sum((inv.paid_amount or 0) for inv in all_invoices),
                "total_admins": len(admins),
                "total_users": len(await User.find(User.role == UserRole.USER).to_list()),
                "total_invoices": len(all_invoices),
                "admins": [{"id": str(a.id), "full_name": a.full_name, "email": a.email} for a in admins]
            }
        except Exception as e:
            import traceback
            raise HTTPException(status_code=500, detail=traceback.format_exc())
    
    # 2. Admin Stats
    if user.role == UserRole.ADMIN:
        descendant_ids = await get_all_descendants(str(user.id))
        all_involved_ids = [str(user.id)] + descendant_ids
        
        from beanie.operators import In
        invoices = await Invoice.find(In(Invoice.user_id, all_involved_ids)).to_list()
        managed_users = await User.find(User.created_by_id == str(user.id)).to_list()
        
        return {
            "active_users": len(descendant_ids),
            "total_invoices": len(invoices),
            "total_sales": sum((inv.paid_amount or 0) for inv in invoices),
            "managed_users": [{"id": str(u.id), "full_name": u.full_name, "email": u.email} for u in managed_users]
        }

    # 3. Regular User Stats (Default fallback)
    user_invoices = await Invoice.find(Invoice.user_id == str(user.id)).to_list()
    
    admin_id = str(user.id) if user.role == UserRole.ADMIN else (user.created_by_id or str(user.id))
    sub_users = await User.find(User.created_by_id == admin_id).to_list()
    all_involved_ids = [admin_id] + [str(u.id) for u in sub_users]
    from beanie.operators import In
    
    clients_count = len(await Client.find(In(Client.user_id, all_involved_ids)).to_list())
    products_count = len(await Product.find(In(Product.user_id, all_involved_ids)).to_list())
    
    print(f"DEBUG: get_stats for user {user.email} (ID: {user.id}) -> clients: {clients_count}, invoices: {len(user_invoices)}")
    # Get recent invoices
    recent_invoices_objs = await Invoice.find(Invoice.user_id == str(user.id)).sort(-Invoice.date).limit(5).to_list()
    recent_invoices = []
    for inv in recent_invoices_objs:
        client = await Client.get(inv.client_id)
        recent_invoices.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "client_name": (client.company_name or client.name) if client else "Unknown",
            "date": inv.date.isoformat(),
            "total_amount": inv.total_amount,
            "status": inv.status
        })

    return {
        "total_sales": sum((inv.paid_amount or 0) for inv in user_invoices),
        "total_clients": clients_count,
        "total_products": products_count,
        "total_invoices": len(user_invoices),
        "recent_invoices": recent_invoices
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
