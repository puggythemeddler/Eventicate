import { NextResponse } from "next/server";

export async function GET() {
  const methods = [
    { id: "mpesa", name: "M-Pesa", description: "Pay with M-Pesa mobile money", icon: "smartphone" },
    { id: "pesapal", name: "PesaPal", description: "Pay with PesaPal", icon: "credit-card" },
    { id: "stripe", name: "Credit/Debit Card", description: "Pay with Visa, Mastercard", icon: "credit-card" },
  ];

  return NextResponse.json({ methods });
}
