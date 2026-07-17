# Quick Start Guide

## 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

## 2. Setup Database

```bash
cd backend
cp .env.example .env
# Edit .env and add your PostgreSQL DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
```

## 3. Get Shopify Access Token

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app"
3. Configure Admin API scopes: read_orders, write_orders, read_fulfillments, write_fulfillments
4. Install app
5. Copy the Admin API access token

## 4. Run the App

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## 5. Open Browser

Go to http://localhost:3000

## 6. Add Your Store

1. Click "Add Store"
2. Enter:
   - Store Name: "My Store"
   - Shop Domain: your-store.myshopify.com
   - Access Token: shpat_xxxxx (from step 3)
3. Click "Add Store"

## 7. Manage Orders!

Navigate to "Orders" page and start managing your Shopify orders across all connected stores.

---

**Need help?** Check the main README.md for detailed instructions.
