-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "logoLight" TEXT,
    "logoDark" TEXT,
    "logoInvoice" TEXT,
    "appName" TEXT NOT NULL DEFAULT 'Eventicate',
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "description" TEXT,
    "images" TEXT NOT NULL,
    "rentalPrice" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "setupCharge" REAL NOT NULL DEFAULT 0,
    "transportCharge" REAL NOT NULL DEFAULT 0,
    "operatorCharge" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("category", "condition", "createdAt", "description", "id", "images", "isActive", "name", "operatorCharge", "providerId", "quantity", "rentalPrice", "setupCharge", "subcategory", "transportCharge", "updatedAt") SELECT "category", "condition", "createdAt", "description", "id", "images", "isActive", "name", "operatorCharge", "providerId", "quantity", "rentalPrice", "setupCharge", "subcategory", "transportCharge", "updatedAt" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE TABLE "new_ProviderProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "phone" TEXT,
    "website" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" REAL NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "defaultDiscount" REAL NOT NULL DEFAULT 0,
    "applyDiscountToAll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProviderProfile" ("address", "averageRating", "businessName", "category", "city", "country", "coverImageUrl", "createdAt", "description", "id", "isApproved", "latitude", "logoUrl", "longitude", "phone", "totalReviews", "updatedAt", "userId", "website") SELECT "address", "averageRating", "businessName", "category", "city", "country", "coverImageUrl", "createdAt", "description", "id", "isApproved", "latitude", "logoUrl", "longitude", "phone", "totalReviews", "updatedAt", "userId", "website" FROM "ProviderProfile";
DROP TABLE "ProviderProfile";
ALTER TABLE "new_ProviderProfile" RENAME TO "ProviderProfile";
CREATE UNIQUE INDEX "ProviderProfile_userId_key" ON "ProviderProfile"("userId");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "images" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("basePrice", "category", "createdAt", "description", "id", "images", "isActive", "name", "providerId", "updatedAt") SELECT "basePrice", "category", "createdAt", "description", "id", "images", "isActive", "name", "providerId", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
