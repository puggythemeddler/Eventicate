import type { EventType, ServiceCategory, BookingStatus } from "@prisma/client";

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

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: "VENUE", label: "Venues", icon: "🏛️" },
  { value: "PA_SYSTEM", label: "PA & Audio", icon: "🔊" },
  { value: "CATERING", label: "Catering", icon: "🍽️" },
  { value: "TRANSPORT", label: "Transport", icon: "🚌" },
  { value: "PHOTOGRAPHY", label: "Photography", icon: "📷" },
  { value: "VIDEOGRAPHY", label: "Videography", icon: "🎬" },
  { value: "DECORATION", label: "Decoration", icon: "🎨" },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: "🎭" },
  { value: "OTHER", label: "Other Services", icon: "✨" },
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  QUOTATION_REQUESTED: "Quotation Requested",
  QUOTATION_SENT: "Quotation Sent",
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
