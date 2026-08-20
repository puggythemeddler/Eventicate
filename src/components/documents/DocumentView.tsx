"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DocumentPrintStyles } from "@/components/documents/DocumentPrintStyles";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import type { LineItem } from "@/lib/documents";

type PrintFormat = "a4" | "thermal";

interface DocumentData {
  id: string;
  type: string;
  status: string;
  documentNumber: string;
  senderName: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  recipientAddress: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  depositRequired: number | null;
  depositPaid: boolean;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  issuedAt: string;
  dueAt: string | null;
  lineItems: LineItem[];
  booking?: {
    event: { title: string; eventDate: string };
    provider?: { businessName: string };
    customer?: { user: { firstName: string; lastName: string; email: string } };
  } | null;
}

interface DocumentViewProps {
  document: DocumentData;
  role: "CUSTOMER" | "PROVIDER";
  logoUrl: string | null;
}

const statusBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "danger",
};

export function DocumentView({ document, role, logoUrl }: DocumentViewProps) {
  const currency = useCurrency();
  const [format, setFormat] = useState<PrintFormat>("a4");

  const handlePrint = () => {
    window.print();
  };

  const handleStatusUpdate = async (status: string) => {
    const res = await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) window.location.reload();
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    if (res.ok) window.location.replace(role === "CUSTOMER" ? "/dashboard/documents" : "/provider/documents");
  };

  const backLink = role === "CUSTOMER" ? "/dashboard/documents" : "/provider/documents";

  return (
    <>
      <DocumentPrintStyles />

      {/* Toolbar */}
      <div className="no-print mb-6 flex items-center gap-3">
        <Link href={backLink} className="text-sm text-primary-600 hover:text-primary-700">
          &larr; Back
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-charcoal-300 dark:border-charcoal-600">
            <button
              onClick={() => setFormat("a4")}
              className={`px-3 py-1.5 text-sm font-medium ${
                format === "a4"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-charcoal-700 hover:bg-sand dark:bg-charcoal-800 dark:text-charcoal-200 dark:hover:bg-charcoal-700"
              }`}
            >
              A4
            </button>
            <button
              onClick={() => setFormat("thermal")}
              className={`px-3 py-1.5 text-sm font-medium ${
                format === "thermal"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-charcoal-700 hover:bg-sand dark:bg-charcoal-800 dark:text-charcoal-200 dark:hover:bg-charcoal-700"
              }`}
            >
              Thermal 80mm
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            Print
          </Button>
          <Badge variant={statusBadgeVariant[document.status] || "default"}>
            {document.status.replace(/_/g, " ")}
          </Badge>
          <span className="text-sm text-charcoal-500 dark:text-charcoal-400">{document.type}</span>
        </div>
      </div>

      {/* Document content */}
      <div className={format === "a4" ? "print-a4" : "print-thermal"}>
        {/* Invoice Logo */}
        {logoUrl && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex items-start justify-between border-b border-charcoal-200 pb-4 dark:border-charcoal-700">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">{document.documentNumber}</h1>
            <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">Issued: {formatDate(document.issuedAt)}</p>
            {document.dueAt && (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Due: {formatDate(document.dueAt)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-charcoal-900 dark:text-charcoal-100">
              {formatCurrency(document.total, currency)}
            </p>
          </div>
        </div>

        {/* From / To */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-medium text-charcoal-500 dark:text-charcoal-400">From</h3>
            <p className="mt-1 font-medium text-charcoal-900 dark:text-charcoal-100">{document.senderName}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-charcoal-500 dark:text-charcoal-400">To</h3>
            <p className="mt-1 font-medium text-charcoal-900 dark:text-charcoal-100">{document.recipientName}</p>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{document.recipientEmail}</p>
            {document.recipientPhone && (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{document.recipientPhone}</p>
            )}
            {document.recipientAddress && (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{document.recipientAddress}</p>
            )}
          </div>
        </div>

        {/* Event info */}
        {document.booking && (
          <div className="mb-4 rounded-lg bg-sand p-3 text-sm dark:bg-charcoal-800">
            Event: <span className="font-medium">{document.booking.event.title}</span>
            &nbsp;&middot;&nbsp;
            Date: <span className="font-medium">{formatDate(document.booking.event.eventDate)}</span>
          </div>
        )}

        {/* Line items */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-sm text-charcoal-500 dark:border-charcoal-700 dark:text-charcoal-400">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-charcoal-100 dark:border-charcoal-800">
                <td className="py-2 text-sm text-charcoal-900 dark:text-charcoal-100">{item.description}</td>
                <td className="py-2 text-right text-sm text-charcoal-500 dark:text-charcoal-400">{item.quantity}</td>
                <td className="py-2 text-right text-sm text-charcoal-500 dark:text-charcoal-400">{formatCurrency(item.unitPrice, currency)}</td>
                <td className="py-2 text-right text-sm font-medium text-charcoal-900 dark:text-charcoal-100">
                  {formatCurrency(item.total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 space-y-1 border-t border-charcoal-200 pt-3 dark:border-charcoal-700">
          <div className="flex justify-between text-sm text-charcoal-500 dark:text-charcoal-400">
            <span>Subtotal</span>
            <span>{formatCurrency(document.subtotal, currency)}</span>
          </div>
          {document.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-charcoal-500 dark:text-charcoal-400">
              <span>Discount ({document.discountRate}%)</span>
              <span>-{formatCurrency(document.discountAmount, currency)}</span>
            </div>
          )}
          {document.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-charcoal-500 dark:text-charcoal-400">
              <span>Tax ({document.taxRate}%)</span>
              <span>{formatCurrency(document.taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-charcoal-900 dark:text-charcoal-100">
            <span>Total</span>
            <span>{formatCurrency(document.total, currency)}</span>
          </div>
        </div>

        {document.depositRequired != null && document.type === "QUOTE" && (
          <div className="mt-3 rounded-lg bg-gold-50 p-3 text-sm text-gold-800 dark:bg-gold-900/30 dark:text-gold-300">
            Deposit Required: {formatCurrency(document.depositRequired, currency)}
            {document.depositPaid && " (Paid)"}
          </div>
        )}

        {document.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Notes</h3>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-400">{document.notes}</p>
          </div>
        )}
        {document.terms && (
          <div className="mt-3">
            <h3 className="text-sm font-semibold">Terms</h3>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-400">{document.terms}</p>
          </div>
        )}
        {document.validUntil && (
          <p className="mt-3 text-sm text-charcoal-500 dark:text-charcoal-400">Valid until: {formatDate(document.validUntil)}</p>
        )}
      </div>

      {/* Action buttons (below document) */}
      {role === "CUSTOMER" && (
        <div className="no-print mt-8 flex gap-4">
          {document.type === "QUOTE" && document.status === "SENT" && (
            <Button onClick={() => handleStatusUpdate("ACCEPTED")}>
              Accept Quote
            </Button>
          )}
          {document.type === "INVOICE" && (document.status === "SENT" || document.status === "OVERDUE") && (
            <Button onClick={() => handleStatusUpdate("PAID")} variant="primary">
              Mark as Paid
            </Button>
          )}
        </div>
      )}

      {role === "PROVIDER" && (
        <div className="no-print mt-8 flex flex-wrap gap-3">
          {document.status === "DRAFT" && (
            <>
              <Button onClick={() => handleStatusUpdate("SENT")} variant="primary">
                Send Document
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm("Delete this draft? This cannot be undone.")) handleDelete();
                }}
                variant="danger"
              >
                Delete Draft
              </Button>
            </>
          )}
          {document.type === "QUOTE" && document.status === "SENT" && (
            <Button
              onClick={() => {
                if (window.confirm("Cancel this quote? The customer will no longer be able to accept it.")) {
                  handleStatusUpdate("CANCELLED");
                }
              }}
              variant="danger"
            >
              Cancel Quote
            </Button>
          )}
          {document.type === "INVOICE" && (document.status === "SENT" || document.status === "OVERDUE") && (
            <Button onClick={() => handleStatusUpdate("PAID")} variant="primary">
              Mark as Paid
            </Button>
          )}
        </div>
      )}
    </>
  );
}
