import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("Ethereal email:", testAccount.web);
  }
  return transporter;
}

const from = process.env.SMTP_FROM || "noreply@eventicate.com";
const appName = "Eventicate";

function wrapHtml(body: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;background:#f9f9f9">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr>
          <td style="background:#c04a1f;padding:24px 32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">${appName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#333;font-size:15px;line-height:1.6">${body}</td>
        </tr>
        <tr>
          <td style="background:#f3f3f3;padding:20px 32px;text-align:center;color:#888;font-size:12px;border-top:1px solid #e0e0e0">
            <p style="margin:0 0 4px">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            <p style="margin:0">Your event marketplace</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function ctaButton(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;padding:14px 32px;background:#c04a1f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0">${label}</a>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = await getTransporter();
  const info = await t.sendMail({ from: `${appName} <${from}>`, to, subject, html });
  if (!process.env.SMTP_HOST) {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
  return info;
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(to, `Welcome to ${appName}!`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">Welcome to ${appName}!</p>
    <p>Hi ${name},</p>
    <p>Thank you for signing up. Start exploring event services or create your provider profile to grow your business.</p>
    ${ctaButton(process.env.NEXT_PUBLIC_APP_URL || "", "Get Started")}
  `));
}

export async function sendBookingConfirmation(to: string, name: string, booking: { id: string; eventName: string; eventDate: string; providerName: string; totalCost: number; status: string }) {
  const dateStr = new Date(booking.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await sendEmail(to, `Booking Confirmed: ${booking.eventName}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">Booking Confirmed!</p>
    <p>Hi ${name},</p>
    <p>Your booking has been confirmed. Here are the details:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;background:#f5f5f5;border-radius:8px">
      <tr><td style="font-weight:600;width:120px;color:#666">Event</td><td>${booking.eventName}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Date</td><td>${dateStr}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Provider</td><td>${booking.providerName}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Total</td><td>$${booking.totalCost.toFixed(2)}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Status</td><td style="color:#c04a1f;font-weight:600">${booking.status.replace(/_/g, " ")}</td></tr>
    </table>
    ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/bookings/${booking.id}`, "View Booking")}
  `));
}

export async function sendNewBookingNotification(to: string, name: string, booking: { id: string; eventName: string; eventDate: string; customerName: string; totalCost: number }) {
  const dateStr = new Date(booking.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await sendEmail(to, `New Booking: ${booking.eventName}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">New Booking Request</p>
    <p>Hi ${name},</p>
    <p>You have received a new booking request. Review the details below:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;background:#f5f5f5;border-radius:8px">
      <tr><td style="font-weight:600;width:120px;color:#666">Event</td><td>${booking.eventName}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Date</td><td>${dateStr}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Customer</td><td>${booking.customerName}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Amount</td><td>$${booking.totalCost.toFixed(2)}</td></tr>
    </table>
    ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL || ""}/provider/bookings/${booking.id}`, "Review Booking")}
  `));
}

export async function sendBookingStatusUpdate(to: string, name: string, booking: { id: string; eventName: string; status: string }) {
  await sendEmail(to, `Booking Update: ${booking.eventName} is now ${booking.status.replace(/_/g, " ").toLowerCase()}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">Booking Status Updated</p>
    <p>Hi ${name},</p>
    <p>Your booking <strong>${booking.eventName}</strong> has been updated to:</p>
    <div style="text-align:center;margin:20px 0;padding:16px;background:#f0fdf4;border:2px solid #c04a1f;border-radius:8px">
      <span style="font-size:20px;font-weight:700;color:#c04a1f;text-transform:uppercase">${booking.status.replace(/_/g, " ")}</span>
    </div>
    ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/bookings/${booking.id}`, "View Details")}
  `));
}

export async function sendMessageNotification(to: string, name: string, message: { senderName: string; preview: string; conversationUrl: string }) {
  await sendEmail(to, `New message from ${message.senderName}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">New Message</p>
    <p>Hi ${name},</p>
    <p><strong>${message.senderName}</strong> sent you a message:</p>
    <div style="margin:16px 0;padding:16px;background:#f5f5f5;border-left:4px solid #c04a1f;border-radius:4px;color:#555;font-style:italic">${message.preview}</div>
    ${ctaButton(message.conversationUrl, "View Message")}
  `));
}

export async function sendPaymentConfirmation(to: string, name: string, payment: { amount: number; method: string; ref: string; eventName: string }) {
  await sendEmail(to, `Payment Received for ${payment.eventName}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">Payment Received</p>
    <p>Hi ${name},</p>
    <p>We have successfully received your payment. Here are the details:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;background:#f5f5f5;border-radius:8px">
      <tr><td style="font-weight:600;width:120px;color:#666">Event</td><td>${payment.eventName}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Amount</td><td>$${payment.amount.toFixed(2)}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Method</td><td>${payment.method}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Reference</td><td style="font-family:monospace;font-size:13px">${payment.ref}</td></tr>
    </table>
    ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/bookings`, "View Bookings")}
  `));
}

export async function sendDocumentNotification(to: string, name: string, doc: { type: string; number: string; url: string }) {
  await sendEmail(to, `New ${doc.type}: ${doc.number}`, wrapHtml(`
    <p style="font-size:18px;font-weight:600;margin:0 0 16px">New ${doc.type}</p>
    <p>Hi ${name},</p>
    <p>A new ${doc.type.toLowerCase()} has been generated for you:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;background:#f5f5f5;border-radius:8px">
      <tr><td style="font-weight:600;width:120px;color:#666">Type</td><td>${doc.type}</td></tr>
      <tr><td style="font-weight:600;width:120px;color:#666">Number</td><td style="font-family:monospace;font-size:13px">${doc.number}</td></tr>
    </table>
    ${ctaButton(doc.url, "View Document")}
  `));
}
