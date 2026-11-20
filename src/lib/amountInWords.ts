const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]

function twoDigits(n: number): string {
  if (n < 20) return ones[n]
  return (tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')).trim()
}

function threeDigits(n: number): string {
  if (n === 0) return ''
  if (n < 100) return twoDigits(n)
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + twoDigits(n % 100) : '')
}

function convertToWords(n: number): string {
  if (n === 0) return 'Zero'
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000

  let result = ''
  if (crore > 0) result += threeDigits(crore) + ' Crore '
  if (lakh > 0) result += threeDigits(lakh) + ' Lakh '
  if (thousand > 0) result += threeDigits(thousand) + ' Thousand '
  if (remainder > 0) result += threeDigits(remainder)

  return result.trim()
}

export function amountToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'Invalid Amount'

  const rupees = Math.floor(amount)
  const paiseRaw = Math.round((amount - rupees) * 100)
  const paise = paiseRaw > 99 ? 0 : paiseRaw

  let result = 'Rupees ' + convertToWords(rupees)

  if (paise > 0) {
    result += ' and ' + twoDigits(paise) + ' Paise'
  }

  return result + ' Only'
}
