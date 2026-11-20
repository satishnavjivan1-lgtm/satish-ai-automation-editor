/**
 * Navjivan ERP — Prisma Seed File
 * Jamnagar, Gujarat | Brass Manufacturing
 *
 * Run: npx prisma db seed
 *   or: ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts
 */

import { PrismaClient, PartyType, CategoryType, UnitType, PriceMode, GSTType, InvoiceStatus, InvoiceType, PaymentMode, StockType } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helper ───────────────────────────────────────────────────────────────────

function amountToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = 'Rupees ' + convert(rupees);
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
  return words + ' Only';
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Navjivan ERP database...\n');

  // ── 1. Company ──────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name:      'Navjivan ERP System',
      address:   'Plot No. 12, GIDC Industrial Estate, Shantiniketan',
      city:      'Jamnagar',
      state:     'Gujarat',
      stateCode: '24',
      gstin:     '24AABCN1234N1Z5',
      pan:       'AABCN1234N',
      phone:     '9825000001',
      email:     'info@navjivanerp.com',
      bankName:  'State Bank of India',
      accountNo: '31234567890',
      ifscCode:  'SBIN0001234',
      upiId:     'navjivan@sbi',
    },
  });
  console.log('✅ Company seeded:', company.name);

  // ── 2. Item Categories ───────────────────────────────────────────────────────
  const catRaw = await prisma.itemCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Raw Material',   type: CategoryType.RAW_MATERIAL,   description: 'Brass ingots, rods, wire, scrap' },
  });
  const catWip = await prisma.itemCategory.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Work In Process', type: CategoryType.WIP,            description: 'Semi-finished brass components' },
  });
  const catFG = await prisma.itemCategory.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'Finished Good',  type: CategoryType.FINISHED_GOOD,  description: 'Ready-to-ship brass parts' },
  });
  const catCon = await prisma.itemCategory.upsert({
    where: { id: 4 },
    update: {},
    create: { name: 'Consumable',     type: CategoryType.CONSUMABLE,     description: 'Cutting oil, polish, packaging' },
  });
  console.log('✅ Categories seeded: Raw Material, WIP, Finished Good, Consumable');

  // ── 3. Items (7 Brass Items) ─────────────────────────────────────────────────
  // HSN 7419 — Brass articles; HSN 7408 — Brass wire; HSN 2710 — Cutting oil
  const items = await Promise.all([
    prisma.item.upsert({
      where: { code: 'BRS-ING-001' },
      update: {},
      create: {
        name:          'Brass Ingot (60/40)',
        code:          'BRS-ING-001',
        hsnCode:       '74032100',
        categoryId:    catRaw.id,
        unit:          UnitType.KG,
        priceMode:     PriceMode.PER_KG,
        purchaseRate:  430.0000,
        saleRate:      450.0000,
        gstRate:       18,
        currentQtyPcs: 0,
        currentWeightKg: 500.000,
        grossWeightKg: null,
        minStockQty:   50,
      },
    }),
    prisma.item.upsert({
      where: { code: 'BRS-ROD-001' },
      update: {},
      create: {
        name:          'Brass Round Rod 25mm',
        code:          'BRS-ROD-001',
        hsnCode:       '74082100',
        categoryId:    catRaw.id,
        unit:          UnitType.KG,
        priceMode:     PriceMode.PER_KG,
        purchaseRate:  445.0000,
        saleRate:      470.0000,
        gstRate:       18,
        currentQtyPcs: 0,
        currentWeightKg: 200.000,
        grossWeightKg: null,
        minStockQty:   30,
      },
    }),
    prisma.item.upsert({
      where: { code: 'BRS-BLT-001' },
      update: {},
      create: {
        name:          'Brass Bullet Valve DN15',
        code:          'BRS-BLT-001',
        hsnCode:       '74191000',
        categoryId:    catFG.id,
        unit:          UnitType.PCS,
        priceMode:     PriceMode.PER_GROSS,
        purchaseRate:  2200.0000,
        saleRate:      2800.0000,
        gstRate:       18,
        currentQtyPcs: 2880,
        currentWeightKg: 86.400,
        grossWeightKg: 4.3200,   // 144 pcs weigh 4.32 kg
        minStockQty:   288,
      },
    }),
    prisma.item.upsert({
      where: { code: 'BRS-ELB-001' },
      update: {},
      create: {
        name:          'Brass Elbow 90° ½"',
        code:          'BRS-ELB-001',
        hsnCode:       '74191000',
        categoryId:    catFG.id,
        unit:          UnitType.PCS,
        priceMode:     PriceMode.PER_GROSS,
        purchaseRate:  1800.0000,
        saleRate:      2200.0000,
        gstRate:       18,
        currentQtyPcs: 1440,
        currentWeightKg: 54.000,
        grossWeightKg: 5.4000,   // 144 pcs = 5.4 kg
        minStockQty:   144,
      },
    }),
    prisma.item.upsert({
      where: { code: 'BRS-NUT-001' },
      update: {},
      create: {
        name:          'Brass Hex Nut M10',
        code:          'BRS-NUT-001',
        hsnCode:       '74152900',
        categoryId:    catFG.id,
        unit:          UnitType.PCS,
        priceMode:     PriceMode.PER_KG,
        purchaseRate:  480.0000,
        saleRate:      520.0000,
        gstRate:       18,
        currentQtyPcs: 5000,
        currentWeightKg: 25.000,
        grossWeightKg: 0.7200,   // 144 pcs = 0.72 kg
        minStockQty:   500,
      },
    }),
    prisma.item.upsert({
      where: { code: 'BRS-CAP-001' },
      update: {},
      create: {
        name:          'Brass End Cap ¾"',
        code:          'BRS-CAP-001',
        hsnCode:       '74191000',
        categoryId:    catFG.id,
        unit:          UnitType.PCS,
        priceMode:     PriceMode.PER_GROSS,
        purchaseRate:  3200.0000,
        saleRate:      3800.0000,
        gstRate:       18,
        currentQtyPcs: 720,
        currentWeightKg: 36.000,
        grossWeightKg: 7.2000,   // 144 pcs = 7.2 kg
        minStockQty:   144,
      },
    }),
    prisma.item.upsert({
      where: { code: 'CUT-OIL-001' },
      update: {},
      create: {
        name:          'Cutting Oil (Soluble)',
        code:          'CUT-OIL-001',
        hsnCode:       '27101980',
        categoryId:    catCon.id,
        unit:          UnitType.KG,
        priceMode:     PriceMode.PER_KG,
        purchaseRate:  85.0000,
        saleRate:      100.0000,
        gstRate:       18,
        currentQtyPcs: 0,
        currentWeightKg: 50.000,
        grossWeightKg: null,
        minStockQty:   10,
      },
    }),
  ]);
  console.log(`✅ Items seeded: ${items.length} brass items`);

  // ── 4. Parties (3 customers + 2 vendors) ────────────────────────────────────
  const [cust1, cust2, cust3, vend1, vend2] = await Promise.all([
    prisma.party.upsert({
      where: { id: 1 },
      update: {},
      create: {
        type:              PartyType.CUSTOMER,
        name:              'Rajesh Plumbing Works',
        gstin:             '24AABPR5678R1Z3',
        pan:               'AABPR5678R',
        phone:             '9825111001',
        email:             'rajesh@plumbing.com',
        address:           'Shop 5, Lal Bahadur Market',
        city:              'Rajkot',
        state:             'Gujarat',
        stateCode:         '24',
        creditLimit:       50000.00,
        openingBalance:    5000.00,
        openingBalanceType: 'DR',
      },
    }),
    prisma.party.upsert({
      where: { id: 2 },
      update: {},
      create: {
        type:              PartyType.CUSTOMER,
        name:              'Mumbai Hardware Traders',
        gstin:             '27AABCM9876M1Z1',
        pan:               'AABCM9876M',
        phone:             '9821222003',
        email:             'purchase@mumbaihdw.com',
        address:           '45, Bhuleshwar Market, Kalbadevi',
        city:              'Mumbai',
        state:             'Maharashtra',
        stateCode:         '27',
        creditLimit:       150000.00,
        openingBalance:    0.00,
        openingBalanceType: 'CR',
      },
    }),
    prisma.party.upsert({
      where: { id: 3 },
      update: {},
      create: {
        type:              PartyType.CUSTOMER,
        name:              'Patel Sanitary & Hardware',
        phone:             '9825333005',
        email:             null,
        address:           'Near Bus Stand, Station Road',
        city:              'Jamnagar',
        state:             'Gujarat',
        stateCode:         '24',
        creditLimit:       25000.00,
        openingBalance:    2500.00,
        openingBalanceType: 'DR',
      },
    }),
    prisma.party.upsert({
      where: { id: 4 },
      update: {},
      create: {
        type:              PartyType.VENDOR,
        name:              'Gujarat Brass Mill Pvt Ltd',
        gstin:             '24AABCG4321G1Z9',
        pan:               'AABCG4321G',
        phone:             '9825444007',
        email:             'sales@gujaratbrassmill.com',
        address:           'B-14, GIDC Phase II',
        city:              'Jamnagar',
        state:             'Gujarat',
        stateCode:         '24',
        creditLimit:       0.00,
        openingBalance:    10000.00,
        openingBalanceType: 'CR',
      },
    }),
    prisma.party.upsert({
      where: { id: 5 },
      update: {},
      create: {
        type:              PartyType.VENDOR,
        name:              'Shree Casting Job Works',
        phone:             '9825555009',
        email:             'shreecasting@gmail.com',
        address:           'Plot 7, Hapa GIDC',
        city:              'Jamnagar',
        state:             'Gujarat',
        stateCode:         '24',
        creditLimit:       0.00,
        openingBalance:    0.00,
        openingBalanceType: 'CR',
      },
    }),
  ]);
  console.log('✅ Parties seeded: 3 customers, 2 vendors');

  // ── 5. Sample Invoice 1 — Same-state (Gujarat) customer ─────────────────────
  // Rajesh Plumbing Works — Gujarat — CGST + SGST
  const bulletValve = items[2]; // BRS-BLT-001 — rate 2800 per gross
  const elbow       = items[3]; // BRS-ELB-001 — rate 2200 per gross

  // Invoice line 1: 2 gross = 288 pcs of bullet valve
  const inv1Line1Qty     = 2;        // gross units
  const inv1Line1Pcs     = 288;      // 2 * 144
  const inv1Line1Wt      = 8.640;    // 2 * 4.32 kg
  const inv1Line1Rate    = 2800.0;   // per gross
  const inv1Line1Taxable = inv1Line1Qty * inv1Line1Rate;   // 5600
  const inv1Line1Cgst    = inv1Line1Taxable * 0.09;        // 504
  const inv1Line1Sgst    = inv1Line1Taxable * 0.09;        // 504
  const inv1Line1Total   = inv1Line1Taxable + inv1Line1Cgst + inv1Line1Sgst; // 6608

  // Invoice line 2: 5 gross = 720 pcs of elbow
  const inv1Line2Qty     = 5;
  const inv1Line2Pcs     = 720;
  const inv1Line2Wt      = 27.000;
  const inv1Line2Rate    = 2200.0;
  const inv1Line2Taxable = inv1Line2Qty * inv1Line2Rate;   // 11000
  const inv1Line2Cgst    = inv1Line2Taxable * 0.09;        // 990
  const inv1Line2Sgst    = inv1Line2Taxable * 0.09;        // 990
  const inv1Line2Total   = inv1Line2Taxable + inv1Line2Cgst + inv1Line2Sgst; // 12980

  const inv1Subtotal  = inv1Line1Taxable + inv1Line2Taxable; // 16600
  const inv1Taxable   = inv1Subtotal;
  const inv1Cgst      = inv1Line1Cgst + inv1Line2Cgst;       // 1494
  const inv1Sgst      = inv1Line1Sgst + inv1Line2Sgst;       // 1494
  const inv1Total     = Math.round(inv1Taxable + inv1Cgst + inv1Sgst); // 19588
  const inv1RoundOff  = inv1Total - (inv1Taxable + inv1Cgst + inv1Sgst); // 0

  const invoice1 = await prisma.invoice.upsert({
    where: { invoiceNo: 'NVJ/2024-25/001' },
    update: {},
    create: {
      invoiceNo:     'NVJ/2024-25/001',
      type:          InvoiceType.TAX_INVOICE,
      partyId:       cust1.id,
      invoiceDate:   new Date('2024-04-05'),
      dueDate:       new Date('2024-05-05'),
      sellerState:   '24',
      customerState: '24',
      gstType:       GSTType.SAME_STATE,
      subtotal:      inv1Subtotal,
      discountAmt:   0,
      taxableAmt:    inv1Taxable,
      cgstAmt:       inv1Cgst,
      sgstAmt:       inv1Sgst,
      igstAmt:       0,
      roundOff:      inv1RoundOff,
      totalAmt:      inv1Total,
      amountInWords: amountToWords(inv1Total),
      status:        InvoiceStatus.SENT,
      notes:         'Delivery within 3 days. Quality as per sample.',
      items: {
        create: [
          {
            itemId:      bulletValve.id,
            description: 'Brass Bullet Valve DN15',
            hsnCode:     '74191000',
            qtyPcs:      inv1Line1Pcs,
            weightKg:    inv1Line1Wt,
            unit:        UnitType.GROSS,
            priceMode:   PriceMode.PER_GROSS,
            rate:        inv1Line1Rate,
            discountPct: 0,
            taxableAmt:  inv1Line1Taxable,
            gstRate:     18,
            cgstPct:     9,
            sgstPct:     9,
            igstPct:     0,
            cgstAmt:     inv1Line1Cgst,
            sgstAmt:     inv1Line1Sgst,
            igstAmt:     0,
            totalAmt:    inv1Line1Total,
          },
          {
            itemId:      elbow.id,
            description: 'Brass Elbow 90° ½"',
            hsnCode:     '74191000',
            qtyPcs:      inv1Line2Pcs,
            weightKg:    inv1Line2Wt,
            unit:        UnitType.GROSS,
            priceMode:   PriceMode.PER_GROSS,
            rate:        inv1Line2Rate,
            discountPct: 0,
            taxableAmt:  inv1Line2Taxable,
            gstRate:     18,
            cgstPct:     9,
            sgstPct:     9,
            igstPct:     0,
            cgstAmt:     inv1Line2Cgst,
            sgstAmt:     inv1Line2Sgst,
            igstAmt:     0,
            totalAmt:    inv1Line2Total,
          },
        ],
      },
    },
  });
  console.log('✅ Invoice 1 seeded:', invoice1.invoiceNo, '— ₹', inv1Total, '(SAME_STATE, CGST+SGST)');

  // ── 6. Sample Invoice 2 — Inter-state (Maharashtra) customer ────────────────
  // Mumbai Hardware Traders — Maharashtra — IGST only
  const nut = items[4]; // BRS-NUT-001 — rate 520 per kg
  const cap = items[5]; // BRS-CAP-001 — rate 3800 per gross

  // Line 1: 25 kg of brass hex nuts
  const inv2Line1Kg      = 25;
  const inv2Line1Pcs     = 0; // weight-based
  const inv2Line1Wt      = 25.000;
  const inv2Line1Rate    = 520.0;
  const inv2Line1Taxable = inv2Line1Kg * inv2Line1Rate;    // 13000
  const inv2Line1Igst    = inv2Line1Taxable * 0.18;        // 2340
  const inv2Line1Total   = inv2Line1Taxable + inv2Line1Igst; // 15340

  // Line 2: 3 gross = 432 pcs of end cap
  const inv2Line2Qty     = 3;
  const inv2Line2Pcs     = 432;
  const inv2Line2Wt      = 21.600;
  const inv2Line2Rate    = 3800.0;
  const inv2Line2Taxable = inv2Line2Qty * inv2Line2Rate;   // 11400
  const inv2Line2Igst    = inv2Line2Taxable * 0.18;        // 2052
  const inv2Line2Total   = inv2Line2Taxable + inv2Line2Igst; // 13452

  const inv2Subtotal  = inv2Line1Taxable + inv2Line2Taxable; // 24400
  const inv2Taxable   = inv2Subtotal;
  const inv2Igst      = inv2Line1Igst + inv2Line2Igst;       // 4392
  const inv2Total     = Math.round(inv2Taxable + inv2Igst);  // 28792
  const inv2RoundOff  = inv2Total - (inv2Taxable + inv2Igst);

  const invoice2 = await prisma.invoice.upsert({
    where: { invoiceNo: 'NVJ/2024-25/002' },
    update: {},
    create: {
      invoiceNo:     'NVJ/2024-25/002',
      type:          InvoiceType.TAX_INVOICE,
      partyId:       cust2.id,
      invoiceDate:   new Date('2024-04-12'),
      dueDate:       new Date('2024-05-12'),
      sellerState:   '24',
      customerState: '27',
      gstType:       GSTType.DIFF_STATE,
      subtotal:      inv2Subtotal,
      discountAmt:   0,
      taxableAmt:    inv2Taxable,
      cgstAmt:       0,
      sgstAmt:       0,
      igstAmt:       inv2Igst,
      roundOff:      inv2RoundOff,
      totalAmt:      inv2Total,
      amountInWords: amountToWords(inv2Total),
      status:        InvoiceStatus.PAID,
      notes:         'Transport by DTDC. Consignment note to follow.',
      items: {
        create: [
          {
            itemId:      nut.id,
            description: 'Brass Hex Nut M10',
            hsnCode:     '74152900',
            qtyPcs:      inv2Line1Pcs,
            weightKg:    inv2Line1Wt,
            unit:        UnitType.KG,
            priceMode:   PriceMode.PER_KG,
            rate:        inv2Line1Rate,
            discountPct: 0,
            taxableAmt:  inv2Line1Taxable,
            gstRate:     18,
            cgstPct:     0,
            sgstPct:     0,
            igstPct:     18,
            cgstAmt:     0,
            sgstAmt:     0,
            igstAmt:     inv2Line1Igst,
            totalAmt:    inv2Line1Total,
          },
          {
            itemId:      cap.id,
            description: 'Brass End Cap ¾"',
            hsnCode:     '74191000',
            qtyPcs:      inv2Line2Pcs,
            weightKg:    inv2Line2Wt,
            unit:        UnitType.GROSS,
            priceMode:   PriceMode.PER_GROSS,
            rate:        inv2Line2Rate,
            discountPct: 0,
            taxableAmt:  inv2Line2Taxable,
            gstRate:     18,
            cgstPct:     0,
            sgstPct:     0,
            igstPct:     18,
            cgstAmt:     0,
            sgstAmt:     0,
            igstAmt:     inv2Line2Igst,
            totalAmt:    inv2Line2Total,
          },
        ],
      },
    },
  });
  console.log('✅ Invoice 2 seeded:', invoice2.invoiceNo, '— ₹', inv2Total, '(DIFF_STATE, IGST)');

  // ── 7. Opening Stock Ledger entries ─────────────────────────────────────────
  const stockEntries = [
    { itemId: items[0].id, qtyPcs: 0,    weightKg: 500.000, rate: 430.0000, notes: 'Opening stock — Brass Ingot' },
    { itemId: items[1].id, qtyPcs: 0,    weightKg: 200.000, rate: 445.0000, notes: 'Opening stock — Brass Rod 25mm' },
    { itemId: items[2].id, qtyPcs: 2880, weightKg: 86.400,  rate: 2200.0000, notes: 'Opening stock — Bullet Valve DN15' },
    { itemId: items[3].id, qtyPcs: 1440, weightKg: 54.000,  rate: 1800.0000, notes: 'Opening stock — Elbow 90°' },
    { itemId: items[4].id, qtyPcs: 5000, weightKg: 25.000,  rate: 480.0000, notes: 'Opening stock — Hex Nut M10' },
    { itemId: items[5].id, qtyPcs: 720,  weightKg: 36.000,  rate: 3200.0000, notes: 'Opening stock — End Cap ¾"' },
    { itemId: items[6].id, qtyPcs: 0,    weightKg: 50.000,  rate: 85.0000,  notes: 'Opening stock — Cutting Oil' },
  ];

  for (const entry of stockEntries) {
    await prisma.stockLedger.create({
      data: {
        itemId:    entry.itemId,
        type:      StockType.IN,
        refType:   'OPENING',
        refId:     null,
        qtyPcs:    entry.qtyPcs,
        weightKg:  entry.weightKg,
        rate:      entry.rate,
        notes:     entry.notes,
        entryDate: new Date('2024-04-01'),
      },
    });
  }
  console.log('✅ Stock ledger opening entries seeded for all 7 items');

  console.log('\n🎉 Seeding complete!\n');
  console.log('  Company   : 1');
  console.log('  Categories: 4');
  console.log('  Items     : 7 (brass parts + raw material + consumable)');
  console.log('  Parties   : 5 (3 customers + 2 vendors)');
  console.log('  Invoices  : 2 (same-state + inter-state)');
  console.log('  Stock     : 7 opening entries');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
