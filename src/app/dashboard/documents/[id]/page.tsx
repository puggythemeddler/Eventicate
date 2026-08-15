import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { DocumentView } from "@/components/documents/DocumentView";
import { serverApi } from "@/lib/server-api";
import type { LineItem } from "@/lib/documents";

interface DocPageProps {
  params: Promise<{ id: string }>;
}

type DocumentDetail = {
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
  lineItems: string;
  booking: {
    event: { title: string; eventDate: string };
    provider?: { businessName: string };
    customer?: { user: { firstName: string; lastName: string; email: string } };
  } | null;
};

export default async function CustomerDocumentDetailPage({ params }: DocPageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect("/auth/login");

  const { id } = await params;

  let document: DocumentDetail | undefined;
  try {
    const data = await serverApi<{ document: DocumentDetail }>(`/api/documents/${id}`);
    document = data.document;
  } catch {
    notFound();
  }

  if (!document) notFound();

  const { logoInvoice: logoUrl } = await serverApi<{ logoInvoice: string | null }>("/api/logos");

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <DocumentView
          document={{
            ...document,
            issuedAt: document.issuedAt,
            dueAt: document.dueAt || null,
            validUntil: document.validUntil || null,
            booking: document.booking
              ? {
                  ...document.booking,
                  event: {
                    ...document.booking.event,
                    eventDate: document.booking.event.eventDate,
                  },
                }
              : null,
            lineItems: JSON.parse(document.lineItems) as LineItem[],
          }}
          role="CUSTOMER"
          logoUrl={logoUrl}
        />
      </PageContent>
    </div>
  );
}
