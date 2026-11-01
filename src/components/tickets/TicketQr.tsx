import { ticketQrSvg } from "@/lib/ticket-qr";
import Image from "next/image";

export function TicketQr({ token, label }: { token: string; label: string }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ticketQrSvg(token))}`;
  return <Image src={src} alt={`QR code for ${label}`} width={144} height={144} unoptimized className="h-36 w-36 bg-white p-2" />;
}
