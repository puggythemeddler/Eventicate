import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { DocumentView } from "@/components/documents/DocumentView";
import prisma from "@/lib/prisma";
import type { LineItem } from "@/lib/documents";

interface DocPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderDocumentDetailPage({ params }: DocPageProps) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          event: { select: { title: true, eventDate: true } },
          customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        },
      },
    },
  });

  if (!document || document.senderId !== session.id) {
    redirect("/provider/documents");
  }

  const logoConfig = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  const logoUrl = logoConfig?.logoInvoice || null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <DocumentView
          document={{
            ...document,
            issuedAt: document.issuedAt.toISOString(),
            dueAt: document.dueAt?.toISOString() || null,
            validUntil: document.validUntil?.toISOString() || null,
            booking: document.booking
              ? {
                  ...document.booking,
                  event: {
                    ...document.booking.event,
                    eventDate: document.booking.event.eventDate.toISOString(),
                  },
                }
              : null,
            lineItems: JSON.parse(document.lineItems) as LineItem[],
          }}
          role="PROVIDER"
          logoUrl={logoUrl}
        />
      </PageContent>
    </div>
  );
}
