export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function formatDocumentNumber(num: number): string {
  return String(num).padStart(4, "0");
}

export function calculateDocumentTotals(
  lineItems: LineItem[],
  taxRate: number,
  discountRate: number
): { subtotal: number; taxAmount: number; discountAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
