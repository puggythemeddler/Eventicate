import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { stripDecimals } from "./lib/serialize";
import sessionRouter from "./routes/auth/session";
import registerRouter from "./routes/auth/register";
import loginRouter from "./routes/auth/login";
import logoutRouter from "./routes/auth/logout";
import googleRouter from "./routes/auth/google";
import googleCallbackRouter from "./routes/auth/google-callback";
import forgotPasswordRouter from "./routes/auth/forgot-password";
import resetPasswordRouter from "./routes/auth/reset-password";
import notificationsRouter from "./routes/notifications";

// uploads
import uploadRouter from "./routes/upload";

// admin
import adminRouter from "./routes/admin";
import adminUsersRouter from "./routes/admin/users";
import adminProvidersRouter from "./routes/admin/providers";
import adminSubscriptionPlansRouter from "./routes/admin/subscription-plans";
import adminComplaintsRouter from "./routes/admin/complaints";
import adminLogosRouter from "./routes/admin/logos";
import adminPaymentsRouter from "./routes/admin/payments";
import adminWhatsAppRouter from "./routes/admin/whatsapp";
import complaintsRouter from "./routes/complaints";

// bookings / events / services / equipment / packages / availability / timeline / budget
import bookingsRouter from "./routes/bookings";
import bookingByIdRouter from "./routes/bookings/[id]";
import eventsRouter from "./routes/events";
import eventByIdRouter from "./routes/events/[id]";
import servicesRouter from "./routes/services";
import servicesBulkDiscountRouter from "./routes/services/bulk-discount";
import equipmentRouter from "./routes/equipment";
import packagesRouter from "./routes/packages";
import {
  venuesRouter,
  vehiclesRouter,
  menuPackagesRouter,
  photoPackagesRouter,
} from "./routes/listings";
import availabilityRouter from "./routes/availability";
import timelineRouter from "./routes/timeline";
import budgetRouter from "./routes/budget";

// cart / quotes / providers / reviews
import cartRouter from "./routes/cart";
import cartByIdRouter from "./routes/cart/[id]";
import generateQuoteFromCartRouter from "./routes/quotes/generate-from-cart";
import providersRouter from "./routes/providers";
import providerByIdRouter from "./routes/providers/[id]";
import reviewsRouter from "./routes/reviews";

// payments / documents / agreements / messages
import paymentsRouter from "./routes/payments";
import paymentsInitiateRouter from "./routes/payments/initiate";
import paymentsStatusRouter from "./routes/payments/status";
import paymentsSplitRouter from "./routes/payments/split";
import paymentsMethodsRouter from "./routes/payments/methods";
import mpesaCallbackRouter from "./routes/payments/mpesa-callback";
import documentsRouter from "./routes/documents";
import documentByIdRouter from "./routes/documents/[id]";
import documentsGenerateRouter from "./routes/documents/generate";
import agreementsRouter from "./routes/agreements";
import messagesRouter from "./routes/messages";
import messagesThreadRouter from "./routes/messages/thread";
import messagesThreadByIdRouter from "./routes/messages/thread/[masterQuoteId]";
import whatsappRouter from "./routes/whatsapp";

// locations / provider / local-sync
import locationsImportRouter from "./routes/locations/import";
import locationsCountriesRouter from "./routes/locations/countries";
import locationCountryByIdRouter from "./routes/locations/countries/[id]";
import locationsSubdivisionsRouter from "./routes/locations/subdivisions";
import locationSubdivisionByIdRouter from "./routes/locations/subdivisions/[id]";
import locationsPublicRouter from "./routes/locations/public";
import providerSettingsRouter from "./routes/provider/settings";
import providerSubscriptionRouter from "./routes/provider/subscription";
import providerSubscriptionCheckRouter from "./routes/provider/subscription-check";
import providerReviewsRouter from "./routes/provider/reviews";
import providerDashboardRouter from "./routes/provider/dashboard";
import providerVerificationRouter from "./routes/provider/verification";
import providerAnalyticsRouter from "./routes/provider/analytics";
import customerDashboardRouter from "./routes/customer/dashboard";
import logosRouter from "./routes/logos";
import localSyncRouter from "./routes/local-sync";
import { generalLimiter } from "./lib/rate-limit";
import prisma from "./lib/prisma";
import { deactivateInactiveAccounts } from "./lib/inactive-accounts";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,https://eventicate.vercel.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  return generalLimiter(req, res, next);
});
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin (server-to-server, curl, health checks),
      // configured origins, and any Vercel preview deployment (eventicate-*.vercel.app).
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Prisma returns Decimal instances for money columns; serialize them back to
// plain numbers so the API contract (and every client) stays unchanged.
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => originalJson(stripDecimals(body));
  next();
});

const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// auth
app.use("/api/auth/session", sessionRouter);
app.use("/api/auth/register", registerRouter);
app.use("/api/auth/login", loginRouter);
app.use("/api/auth/logout", logoutRouter);
app.use("/api/auth/google", googleRouter);
app.use("/api/auth/google/callback", googleCallbackRouter);
app.use("/api/auth/forgot-password", forgotPasswordRouter);
app.use("/api/auth/reset-password", resetPasswordRouter);

// notifications
app.use("/api/notifications", notificationsRouter);

// uploads
app.use("/api/upload", uploadRouter);

// admin
app.use("/api/admin", adminRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/providers", adminProvidersRouter);
app.use("/api/admin/subscription-plans", adminSubscriptionPlansRouter);
app.use("/api/admin/complaints", adminComplaintsRouter);
app.use("/api/admin/logos", adminLogosRouter);
app.use("/api/admin/payments", adminPaymentsRouter);
app.use("/api/admin/whatsapp", adminWhatsAppRouter);

// bookings / events / services / equipment / packages / availability / timeline / budget
app.use("/api/bookings", bookingsRouter);
app.use("/api/bookings/:id", bookingByIdRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events/:id", eventByIdRouter);
app.use("/api/services", servicesRouter);
app.use("/api/services/bulk-discount", servicesBulkDiscountRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/venues", venuesRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/menu-packages", menuPackagesRouter);
app.use("/api/photo-packages", photoPackagesRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/timeline", timelineRouter);
app.use("/api/budget", budgetRouter);

// cart / quotes / providers / reviews
app.use("/api/cart", cartRouter);
app.use("/api/cart/:id", cartByIdRouter);
app.use("/api/quotes/generate-from-cart", generateQuoteFromCartRouter);
app.use("/api/providers", providersRouter);
app.use("/api/providers/:id", providerByIdRouter);
app.use("/api/reviews", reviewsRouter);

// payments / documents / agreements / messages
app.use("/api/payments", paymentsRouter);
app.use("/api/payments/initiate", paymentsInitiateRouter);
app.use("/api/payments/status", paymentsStatusRouter);
app.use("/api/payments/split", paymentsSplitRouter);
app.use("/api/payments/methods", paymentsMethodsRouter);
app.use("/api/payments/mpesa-callback", mpesaCallbackRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/documents/generate", documentsGenerateRouter);
app.use("/api/documents/:id", documentByIdRouter);
app.use("/api/agreements", agreementsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/messages/thread", messagesThreadRouter);
  app.use("/api/messages/thread/:masterQuoteId", messagesThreadByIdRouter);
  app.use("/api/whatsapp", whatsappRouter);

// locations / provider / local-sync
app.use("/api/locations/import", locationsImportRouter);
app.use("/api/locations/countries", locationsCountriesRouter);
app.use("/api/locations/countries/:id", locationCountryByIdRouter);
app.use("/api/locations/subdivisions", locationsSubdivisionsRouter);
app.use("/api/locations/subdivisions/:id", locationSubdivisionByIdRouter);
app.use("/api/locations/public", locationsPublicRouter);
app.use("/api/provider/settings", providerSettingsRouter);
app.use("/api/provider/subscription", providerSubscriptionRouter);
app.use("/api/provider/subscription/check", providerSubscriptionCheckRouter);
app.use("/api/provider/reviews", providerReviewsRouter);
app.use("/api/provider/dashboard", providerDashboardRouter);
app.use("/api/provider/verification", providerVerificationRouter);
app.use("/api/provider/analytics", providerAnalyticsRouter);
app.use("/api/customer/dashboard", customerDashboardRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/logos", logosRouter);
app.use("/api/local-sync", localSyncRouter);

// 404 for unmatched /api routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status = err.status || 500;
    if (status >= 500) {
      console.error("Unhandled error:", err);
    }
    res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
  }
);

const PORT = parseInt(process.env.PORT || "3001", 10);
const server = app.listen(PORT, () => {
  console.log(`Eventicate backend listening on port ${PORT}`);
});

// Auto-deactivate accounts that have been inactive for 90+ days. Run once at
// startup and then daily while the process is alive.
let deactivationRunning = false;
async function runInactiveAccountsJob() {
  if (deactivationRunning) return;
  deactivationRunning = true;
  try {
    await deactivateInactiveAccounts();
  } catch (err) {
    console.error("Inactive-accounts job failed:", err);
  } finally {
    deactivationRunning = false;
  }
}
void runInactiveAccountsJob();
const INACTIVITY_JOB_INTERVAL = 24 * 60 * 60 * 1000;
const inactivityJobTimer = setInterval(() => void runInactiveAccountsJob(), INACTIVITY_JOB_INTERVAL);
inactivityJobTimer.unref();

// Graceful shutdown: stop accepting connections, close the Prisma pool, exit.
async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error disconnecting Prisma:", err);
    }
    console.log("Shutdown complete");
    process.exit(0);
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
