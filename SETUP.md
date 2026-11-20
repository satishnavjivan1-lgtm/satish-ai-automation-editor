# Navjivan ERP System — Setup Guide

## Step 1: MySQL Database Setup
Open MySQL / phpMyAdmin and create database:
```sql
CREATE DATABASE navjivan_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 2: Install Dependencies
```bash
cd e:\react\billing-erp
npm install
```

## Step 3: Run Database Migration
```bash
npx prisma migrate dev --name init
```

## Step 4: Load Sample Data (Seed)
```bash
npx prisma db seed
```

## Step 5: Start the Application
```bash
npm run dev
```
Open: http://localhost:3000

## Gujarati Notes (ગુજરાતી):
- MySQL માં root password ખાલી છે (no password)
- Company: Navjivan ERP System
- Default State: Gujarat (24)
- Gross System: 1 Gross = 144 Pieces (brass items)
- Same State (Gujarat) = CGST + SGST
- Other State = IGST

## Troubleshooting:
- If Prisma error: check .env DATABASE_URL
- If port 3000 busy: npm run dev -- -p 3001
- For print invoice: Ctrl+P or use Print button
