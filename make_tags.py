"""Generate a printable PDF of Showroom floor tags — one card per product with
its photo, name, price, tag code, and a QR code that the shopper app scans.
One page per collection. Run: python make_tags.py
"""
import io
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

# (tagCode, name, brand, price, photo)
COLLECTIONS = [
    ("Dynamite — Women's", [
        ("100098543", "Andrea Shirred Jersey T-Shirt", "Dynamite", 34.95, "andrea-tee.jpg"),
        ("100103201", "Stacie Linen Mini Skort", "Dynamite", 59.95, "stacie-skort.jpg"),
        ("100103980", "Priya Wide Leg Pants", "Dynamite", 69.95, "priya-pants.jpg"),
        ("100104794", "Sculpt Plunge Sweetheart Bodysuit", "Dynamite", 39.95, "sculpt-bodysuit.jpg"),
        ("100103903", "Linen High Rise Shorts", "Dynamite", 54.95, "linen-shorts.jpg"),
        ("100102689", "Sculpt Buckle Detail Top", "Dynamite", 44.95, "sculpt-buckle-top.jpg"),
        ("100102299", "Ellie Ribbed Tank Top", "Dynamite", 29.95, "ellie-tank.jpg"),
    ]),
    ("HUGO BOSS — Men's", [
        ("015344602209", "Stacked-Logo Interlock Polo", "HUGO", 189.00, "hb-stacked-polo-002.jpg"),
        ("604553153949", "Italian-Leather Belt", "BOSS", 85.00, "hb-leather-belt-001.jpg"),
        ("604553615492", "Mercerised-Cotton Two-Tone Polo", "BOSS", 249.00, "hb-mercerised-polo-131.jpg"),
        ("604553432402", "Structured-Logo Cotton T-Shirt", "BOSS", 139.00, "hb-logo-tee-100.jpg"),
        ("627919634487", "Long-Sleeved Interlock Polo", "BOSS", 199.00, "hb-longsleeve-polo-252.jpg"),
    ]),
]
PHOTO_DIR = "public/products"
OUT = "Showroom-QR-Tags.pdf"

INK = (0.10, 0.10, 0.10)
GREY = (0.45, 0.45, 0.45)
LINE = (0.80, 0.80, 0.80)


def qr_image(data: str) -> ImageReader:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def wrap(c, text, font, size, max_w):
    c.setFont(font, size)
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_tag(c, x, y, w, h, item):
    code, name, brand, price, photo = item
    pad = 9
    c.setLineWidth(1)
    c.setStrokeColorRGB(*LINE)
    c.roundRect(x, y, w, h, 7, stroke=1, fill=0)

    ph = h - 2 * pad
    pw = ph * (640 / 960)
    try:
        c.drawImage(PHOTO_DIR + "/" + photo, x + pad, y + pad, width=pw, height=ph,
                    preserveAspectRatio=True, anchor="sw", mask="auto")
    except Exception:
        pass

    tx = x + pad + pw + 12
    tw = (x + w - pad) - tx
    ty = y + h - pad - 9
    c.setFillColorRGB(*GREY)
    c.setFont("Helvetica", 7.5)
    c.drawString(tx, ty, brand.upper())
    ty -= 14
    c.setFillColorRGB(*INK)
    for line in wrap(c, name, "Helvetica-Bold", 11, tw)[:3]:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(tx, ty, line)
        ty -= 14
    ty -= 2
    c.setFont("Helvetica-Bold", 15)
    c.drawString(tx, ty, f"${price:0.2f}")

    qsize = 78
    qx, qy = tx, y + pad
    c.drawImage(qr_image(code), qx, qy, width=qsize, height=qsize)
    cap_x = qx + qsize + 8
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(cap_x, qy + qsize - 14, "Scan to")
    c.drawString(cap_x, qy + qsize - 25, "reserve")
    c.setFillColorRGB(*GREY)
    c.setFont("Courier", 7.5)
    c.drawString(cap_x, qy + 6, "#" + code)


def draw_page(c, title, products):
    W, H = letter
    margin = 36
    cols, rows = 2, 4
    gut_x, gut_y = 24, 16
    cw = (W - 2 * margin - (cols - 1) * gut_x) / cols
    ch = (H - 2 * margin - 40 - (rows - 1) * gut_y) / rows

    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, H - margin - 4, f"Showroom floor tags — {title}")
    c.setFillColorRGB(*GREY)
    c.setFont("Helvetica", 9)
    c.drawString(margin, H - margin - 18,
                 "Open the shopper app, tap Scan a tag, and point your camera at a code below.")

    top = H - margin - 40
    for i, item in enumerate(products):
        col, row = i % cols, i // cols
        x = margin + col * (cw + gut_x)
        y = top - (row + 1) * ch - row * gut_y
        draw_tag(c, x, y, cw, ch, item)


def main():
    c = canvas.Canvas(OUT, pagesize=letter)
    for idx, (title, products) in enumerate(COLLECTIONS):
        if idx > 0:
            c.showPage()
        draw_page(c, title, products)
    c.save()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
