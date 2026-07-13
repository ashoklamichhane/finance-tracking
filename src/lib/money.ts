// Money is stored as integer paise everywhere to avoid float rounding errors.
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function paiseToRupees(paise: number): number {
  return paise / 100
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPaise(paise: number): string {
  return inrFormatter.format(paiseToRupees(paise))
}

export function formatCompactPaise(paise: number): string {
  const rupees = paiseToRupees(paise)
  const abs = Math.abs(rupees)
  if (abs >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)}Cr`
  if (abs >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)}L`
  if (abs >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`
  return `₹${rupees.toFixed(0)}`
}
