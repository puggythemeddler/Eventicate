import {
  Building2,
  Music,
  UtensilsCrossed,
  Tent,
  Bus,
  Camera,
  Clapperboard,
  Flower2,
  Mic2,
  Package,
  type LucideIcon,
} from "lucide-react";

export type EventType =
  | "WEDDING" | "FUNERAL" | "BIRTHDAY" | "CORPORATE"
  | "CONCERT" | "CHURCH" | "GRADUATION" | "OTHER";

export type ServiceCategory =
  | "VENUE" | "PA_SYSTEM" | "CATERING" | "TENTS" | "TRANSPORT"
  | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "DECORATION" | "ENTERTAINMENT" | "OTHER";

export type BookingStatus =
  | "QUOTATION_REQUESTED" | "QUOTATION_SENT" | "PENDING_APPROVAL"
  | "CONFIRMED" | "DEPOSIT_PAID" | "COMPLETED" | "CANCELLED" | "REJECTED";

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "WEDDING", label: "Wedding" },
  { value: "FUNERAL", label: "Funeral" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "CONCERT", label: "Concert" },
  { value: "CHURCH", label: "Church Event" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "OTHER", label: "Other" },
];

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; icon: LucideIcon }[] = [
  { value: "VENUE", label: "Venues", icon: Building2 },
  { value: "PA_SYSTEM", label: "PA & Audio", icon: Music },
  { value: "CATERING", label: "Catering", icon: UtensilsCrossed },
  { value: "TENTS", label: "Tents & Canopies", icon: Tent },
  { value: "TRANSPORT", label: "Transport", icon: Bus },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "VIDEOGRAPHY", label: "Videography", icon: Clapperboard },
  { value: "DECORATION", label: "Decoration", icon: Flower2 },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: Mic2 },
  { value: "OTHER", label: "Other Services", icon: Package },
];

export const CATEGORY_IMAGES: Record<ServiceCategory, string> = {
  VENUE: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80&auto=format&fit=crop",
  PA_SYSTEM: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80&auto=format&fit=crop",
  CATERING: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80&auto=format&fit=crop",
  TENTS: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80&auto=format&fit=crop",
  TRANSPORT: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80&auto=format&fit=crop",
  PHOTOGRAPHY: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1200&q=80&auto=format&fit=crop",
  VIDEOGRAPHY: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200&q=80&auto=format&fit=crop",
  DECORATION: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80&auto=format&fit=crop",
  ENTERTAINMENT: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop",
  OTHER: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80&auto=format&fit=crop",
};

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=80&auto=format&fit=crop";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  QUOTATION_REQUESTED: "Quote Requested",
  QUOTATION_SENT: "Quote Sent",
  PENDING_APPROVAL: "Pending Approval",
  CONFIRMED: "Confirmed",
  DEPOSIT_PAID: "Deposit Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const EQUIPMENT_CATEGORIES = {
  audio: ["Speakers", "Subwoofers", "Amplifiers", "Mixers", "Microphones", "Wireless Microphones", "Monitors"],
  instruments: ["Keyboards", "Drums", "Guitars", "Other Instruments"],
  lighting: ["Stage Lights", "Moving Heads", "LED Screens", "Effects Machines"],
  tents: ["Marquees", "Canopies", "Chairs & Tables", "Flooring", "Accessories"],
};

export const VEHICLE_TYPES = ["Van", "Truck", "Bus", "Delivery Vehicle"];

export const REVIEW_CRITERIA = {
  customerToProvider: [
    { key: "serviceQuality", label: "Service Quality" },
    { key: "professionalism", label: "Professionalism" },
    { key: "equipmentQuality", label: "Equipment Quality" },
    { key: "communication", label: "Communication" },
    { key: "reliability", label: "Reliability" },
  ],
  providerToCustomer: [
    { key: "paymentReliability", label: "Payment Reliability" },
    { key: "customerCommunication", label: "Communication" },
    { key: "respectForAgreements", label: "Respect for Agreements" },
    { key: "eventOrganization", label: "Event Organization" },
  ],
};

const SOLEMN_EVENT_TYPES: EventType[] = ["FUNERAL", "CHURCH"];

export function isSolemnEvent(eventType: EventType | string | null | undefined): boolean {
  return eventType != null && (SOLEMN_EVENT_TYPES as string[]).includes(eventType);
}

export function getEventHeroClass(eventType: EventType | string | null | undefined): string {
  return isSolemnEvent(eventType) ? "gradient-hero-sombre" : "gradient-hero";
}