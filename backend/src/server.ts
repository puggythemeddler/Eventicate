import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import sessionRouter from "./routes/auth/session";
import registerRouter from "./routes/auth/register";
import loginRouter from "./routes/auth/login";
import logoutRouter from "./routes/auth/logout";
import googleRouter from "./routes/auth/google";
import googleCallbackRouter from "./routes/auth/google-callback";

// uploads
import uploadRouter from "./routes/upload";

// admin
import adminRouter from "./routes/admin";
import adminUsersRouter from "./routes/admin/users";
import adminProvidersRouter from "./routes/admin/providers";
import adminSubscriptionPlansRouter from "./routes/admin/subscription-plans";
import adminComplaintsRouter from "./routes/admin/complaints";
import adminLogosRouter from "./routes/admin/logos";

// bookings / events / services / equipment / packages / availability / timeline / budget
import bookingsRouter from "./routes/bookings";
import bookingByIdRouter from "./routes/bookings/[id]";
import eventsRouter from "./routes/events";
import eventByIdRouter from "./routes/events/[id]";
import servicesRouter from "./routes/services";
import servicesBulkDiscountRouter from "./routes/services/bulk-discount";
import equipmentRouter from "./routes/equipment";
import packagesRouter from "./routes/packages";
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
import customerDashboardRouter from "./routes/customer/dashboard";
import logosRouter from "./routes/logos";
import localSyncRouter from "./routes/local-sync";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,https://eventicate.vercel.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin (server-to-server, curl, health checks).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// uploads
app.use("/api/upload", uploadRouter);

// admin
app.use("/api/admin", adminRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/providers", adminProvidersRouter);
app.use("/api/admin/subscription-plans", adminSubscriptionPlansRouter);
app.use("/api/admin/complaints", adminComplaintsRouter);
app.use("/api/admin/logos", adminLogosRouter);

// bookings / events / services / equipment / packages / availability / timeline / budget
app.use("/api/bookings", bookingsRouter);
app.use("/api/bookings/:id", bookingByIdRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events/:id", eventByIdRouter);
app.use("/api/services", servicesRouter);
app.use("/api/services/bulk-discount", servicesBulkDiscountRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/packages", packagesRouter);
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
app.use("/api/documents/:id", documentByIdRouter);
app.use("/api/documents/generate", documentsGenerateRouter);
app.use("/api/agreements", agreementsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/messages/thread", messagesThreadRouter);
app.use("/api/messages/thread/:masterQuoteId", messagesThreadByIdRouter);

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
app.use("/api/customer/dashboard", customerDashboardRouter);
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
app.listen(PORT, () => {
  console.log(`Eventicate backend listening on port ${PORT}`);
});
