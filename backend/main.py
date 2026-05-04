from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Optional
from datetime import datetime, timedelta
import io

from database import init_db
from models import (
    User, UserRole, Client, Product, Invoice, InvoiceItem, InvoiceStatus
)
from schemas import (
    UserCreate, UserOut, ClientCreate, ClientOut, ProductCreate, ProductOut, InvoiceCreate
)
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, check_role
)
from pdf_gen import generate_invoice_pdf
from contextlib import asynccontextmanager

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

# --- CLIENTS ---
@app.post("/clients", response_model=ClientOut)
async def create_client(
    client_in: ClientCreate, 
    user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))
):
    try:
        new_client = Client(**client_in.dict(), user_id=str(user.id))
        await new_client.insert()
        return {
            "id": str(new_client.id),
            "name": new_client.name,
            "mobile": new_client.mobile,
            "email": new_client.email,
            "address": new_client.address,
            "gst_number": new_client.gst_number,
            "created_at": new_client.created_at
        }
    except Exception as e:
        print(f"ERROR CREATING CLIENT: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clients", response_model=List[ClientOut])
async def get_clients(user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))):
    if user.role == UserRole.SUPER_ADMIN:
        clients = await Client.find_all().to_list()
    else:
        clients = await Client.find(Client.user_id == str(user.id)).to_list()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "mobile": c.mobile,
            "email": c.email,
            "address": c.address,
            "gst_number": c.gst_number,
            "created_at": c.created_at
        } for c in clients
    ]

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
            "name": new_product.name,
            "price": new_product.price,
            "gst_percent": new_product.gst_percent,
            "stock": new_product.stock,
            "created_at": new_product.created_at
        }
    except Exception as e:
        print(f"ERROR CREATING PRODUCT: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products", response_model=List[ProductOut])
async def get_products(user: User = Depends(check_role([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]))):
    if user.role == UserRole.SUPER_ADMIN:
        products = await Product.find_all().to_list()
    else:
        products = await Product.find(Product.user_id == str(user.id)).to_list()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price": p.price,
            "gst_percent": p.gst_percent,
            "stock": p.stock,
            "created_at": p.created_at
        } for p in products
    ]

# --- INVOICES ---
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
            line_subtotal = item.price * (item.quantity or 0)
            line_gst = (line_subtotal * (item.gst_percent or 0)) / 100
            sub_total += line_subtotal
            total_gst += line_gst
            
            if item.product_id:
                db_product = await Product.get(item.product_id)
                if db_product:
                    db_product.stock -= (item.quantity or 0)
                    await db_product.save()
            
            items_to_save.append(InvoiceItem(**item.dict()))

        final_amount = sub_total + total_gst - (invoice_in.discount or 0)
        
        new_invoice = Invoice(
            user_id=str(user.id),
            client_id=invoice_in.client_id,
            invoice_number=invoice_in.invoice_number,
            sub_total=sub_total,
            total_gst=total_gst,
            total_amount=final_amount,
            paid_amount=invoice_in.paid_amount or 0,
            discount=invoice_in.discount or 0,
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
        print(f"ERROR CREATING INVOICE: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

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
                "discount": inv.discount,
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
        
        # Authorization
        can_access = False
        if user.role == UserRole.SUPER_ADMIN:
            can_access = True
        elif user.role == UserRole.ADMIN:
            creator = await User.get(invoice.user_id)
            if creator and (str(creator.id) == str(user.id) or creator.created_by_id == str(user.id)):
                can_access = True
        elif user.role == UserRole.USER:
            if invoice.user_id == str(user.id):
                can_access = True
                
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to access this invoice")

        creator = await User.get(invoice.user_id)
        business_details = {
            "name": (creator.full_name if creator else user.full_name) + " Business",
            "address": "123 Business Plaza, City, India",
            "email": creator.email if creator else user.email,
            "phone": "+91 9876543210",
            "gst": "33AABCA1234A1Z1"
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
        error_msg = f"ERROR GENERATING PDF: {str(e)}"
        print(error_msg)
        with open("error_log.txt", "a") as f:
            import datetime
            f.write(f"[{datetime.datetime.now()}] {error_msg}\n")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

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
            "total_sales": sum((inv.total_amount or 0) for inv in invoices),
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
                "total_sales": sum((inv.total_amount or 0) for inv in all_invoices),
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
            "total_sales": sum((inv.total_amount or 0) for inv in invoices),
            "managed_users": [{"id": str(u.id), "full_name": u.full_name, "email": u.email} for u in managed_users]
        }

    # 3. Regular User Stats (Default fallback)
    user_invoices = await Invoice.find(Invoice.user_id == str(user.id)).to_list()
    return {
        "total_sales": sum((inv.total_amount or 0) for inv in user_invoices),
        "total_clients": len(await Client.find(Client.user_id == str(user.id)).to_list()),
        "total_products": len(await Product.find(Product.user_id == str(user.id)).to_list()),
        "total_invoices": len(user_invoices)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
