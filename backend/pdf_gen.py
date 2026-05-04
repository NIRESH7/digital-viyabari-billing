from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from io import BytesIO
from models import Invoice
import datetime

def num_to_words(num):
    # Very basic converter for demonstration, can be improved
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    
    if num == 0: return "Zero"
    
    def helper(n):
        if n < 10: return units[n]
        elif n < 20: return teens[n-10]
        elif n < 100: return tens[n//10] + (" " + units[n%10] if n%10 != 0 else "")
        elif n < 1000: return units[n//100] + " Hundred" + (" and " + helper(n%100) if n%100 != 0 else "")
        elif n < 100000: return helper(n//1000) + " Thousand" + (" " + helper(n%1000) if n%1000 != 0 else "")
        return str(n)

    res = helper(int(num))
    return res + " Rupees Only"

def generate_invoice_pdf(invoice: Invoice, client, business_details: dict):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    # Colors
    primary_blue = colors.HexColor("#0066cc")
    
    # Custom Styles
    biz_name_style = ParagraphStyle('BizName', fontSize=22, textColor=primary_blue, alignment=1, fontName='Helvetica-Bold')
    biz_addr_style = ParagraphStyle('BizAddr', fontSize=9, alignment=1, textColor=colors.black, leading=11)
    tax_invoice_style = ParagraphStyle('TaxInvoice', fontSize=14, alignment=2, fontName='Helvetica-Bold')
    label_style = ParagraphStyle('Label', fontSize=10, fontName='Helvetica-Bold')
    value_style = ParagraphStyle('Value', fontSize=10)
    footer_style = ParagraphStyle('Footer', fontSize=8, alignment=1, textColor=colors.grey)

    # 1. Header (Using Table for better alignment)
    header_data = [
        [Paragraph(business_details.get("name", "ABC TRAINING SOLUTIONS").upper(), biz_name_style)],
        [Paragraph(business_details.get("address", "123 Business Plaza, Chennai, India - 600001"), biz_addr_style)],
        [Paragraph(f"Email: {business_details.get('email', 'info@abctraining.com')} | Ph: {business_details.get('phone', '+91 9876543210')}", biz_addr_style)]
    ]
    header_table = Table(header_data, colWidths=[535])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # Blue line
    elements.append(Table([[""]], colWidths=[535], style=[('LINEBELOW', (0,0), (-1,-1), 1.5, primary_blue)]))
    elements.append(Spacer(1, 20))

    # 2. Invoice Info & Client Details
    billed_to = [
        [Paragraph("<b>Billed To:</b>", label_style), "", Paragraph("<b>TAX INVOICE</b>", tax_invoice_style)],
        [Paragraph(f"Name: {client.name}", value_style), "", Paragraph(f"Invoice No: {invoice.invoice_number}", value_style)],
        [Paragraph(f"Phone: {client.mobile}", value_style), "", Paragraph(f"Date: {invoice.date.strftime('%d/%m/%Y')}", value_style)],
        [Paragraph(f"Address: {client.address}", value_style), "", ""]
    ]
    
    top_table = Table(billed_to, colWidths=[250, 100, 185])
    top_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 25))

    # 3. Items Table
    item_header = ["S.No", "Description", "HSN/SAC", "Qty", "Unit Price", "Amount"]
    item_data = [item_header]
    
    subtotal = 0
    total_gst = 0
    
    for idx, item in enumerate(invoice.items, 1):
        line_subtotal = item.price * (item.quantity or 0)
        line_gst = (line_subtotal * (item.gst_percent or 0)) / 100
        item_data.append([
            str(idx),
            Paragraph(item.product_name, value_style),
            getattr(item, 'hsn_sac', '-') or '-',
            str(item.quantity or 0),
            f"{item.price:,.2f}",
            f"{line_subtotal:,.2f}"
        ])
        subtotal += line_subtotal
        total_gst += line_gst

    items_table = Table(item_data, colWidths=[40, 215, 70, 40, 85, 85])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (5, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # 4. Summary / Totals
    cgst = (total_gst or 0) / 2
    sgst = (total_gst or 0) / 2
    grand_total = subtotal + (total_gst or 0) - (invoice.discount or 0)
    
    summary_data = [
        [Paragraph(f"<b>Amount in Words:</b><br/>{num_to_words(grand_total)}", value_style), "Subtotal:", f"{subtotal:,.2f}"],
        ["", "CGST @ 9%:", f"{cgst:,.2f}"],
        ["", "SGST @ 9%:", f"{sgst:,.2f}"],
        ["", "Discount:", f"-{(invoice.discount or 0):,.2f}"],
        ["", Paragraph("<b>Grand Total:</b>", ParagraphStyle('GT', fontSize=12, fontName='Helvetica-Bold')), Paragraph(f"<b>INR {grand_total:,.2f}</b>", ParagraphStyle('GTVal', fontSize=12, fontName='Helvetica-Bold', alignment=2))]
    ]
    
    summary_table = Table(summary_data, colWidths=[300, 150, 85])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (1, 4), (2, 4), 1, colors.black),
        ('TOPPADDING', (0, 4), (-1, 4), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 60))

    # 5. Signatory Section
    sign_data = [
        ["", Paragraph(f"For <b>{business_details.get('name', 'ABC Training Solutions')}</b>", ParagraphStyle('Sign', alignment=2, fontSize=10))],
        ["", ""],
        ["", ""],
        ["", Paragraph("_______________________", ParagraphStyle('Line', alignment=2))],
        ["", Paragraph("Authorized Signatory", ParagraphStyle('Auth', alignment=2, fontSize=9))]
    ]
    sign_table = Table(sign_data, colWidths=[300, 235])
    elements.append(sign_table)
    
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("Thank you for your business!", ParagraphStyle('Thanks', alignment=1, fontSize=10)))
    elements.append(Paragraph("E. & O.E. This is a computer generated invoice and does not require a signature.", footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
