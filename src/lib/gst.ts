export function calculateGST(
  taxableAmt: number,
  gstRate: number,
  sellerState: string,
  customerState: string
) {
  const isSameState = sellerState === customerState
  const rateNum = Number(gstRate) || 0

  if (isSameState) {
    const halfRate = rateNum / 2
    const cgstAmt = parseFloat(((taxableAmt * halfRate) / 100).toFixed(2))
    const sgstAmt = cgstAmt
    return {
      gstType: 'SAME_STATE',
      cgstPct: halfRate,
      sgstPct: halfRate,
      igstPct: 0,
      cgstAmt,
      sgstAmt,
      igstAmt: 0,
    }
  } else {
    const igstAmt = parseFloat(((taxableAmt * rateNum) / 100).toFixed(2))
    return {
      gstType: 'DIFF_STATE',
      cgstPct: 0,
      sgstPct: 0,
      igstPct: rateNum,
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt,
    }
  }
}

export function getItemMultiplier(
  qty: number,
  weightKg: number,
  unit: string,
  priceMode: string
): number {
  const q = Number(qty) || 0
  const wt = Number(weightKg) || 0

  if (priceMode === 'PER_KG') {
    return wt > 0 ? wt : q
  }
  if (priceMode === 'PER_GRAM') {
    return wt > 0 ? wt * 1000 : q
  }
  if (priceMode === 'PER_GROSS') {
    // In Jamnagar brass trade: 1 Gross = 144 Pieces
    if (unit === 'PCS') {
      return q / 144
    }
    return q
  }
  return q
}

export function calculateLineItem({
  qty,
  weightKg = 0,
  unit = 'PCS',
  priceMode = 'PER_PIECE',
  rate,
  discountPct = 0,
  gstRate = 18,
  sellerState = '24',
  customerState = '24',
}: {
  qty: number
  weightKg?: number
  unit?: string
  priceMode?: string
  rate: number
  discountPct?: number
  gstRate?: number
  sellerState?: string
  customerState?: string
}) {
  const multiplier = getItemMultiplier(qty, weightKg, unit, priceMode)
  const baseAmt = multiplier * Number(rate)
  const discPct = Number(discountPct) || 0
  const discountAmt = baseAmt * (discPct / 100)
  const taxableAmt = parseFloat((baseAmt - discountAmt).toFixed(2))

  const gst = calculateGST(taxableAmt, gstRate, sellerState, customerState)
  const totalAmt = parseFloat((taxableAmt + gst.cgstAmt + gst.sgstAmt + gst.igstAmt).toFixed(2))

  return {
    multiplier,
    baseAmt: parseFloat(baseAmt.toFixed(2)),
    discountAmt: parseFloat(discountAmt.toFixed(2)),
    taxableAmt,
    ...gst,
    totalAmt,
  }
}
