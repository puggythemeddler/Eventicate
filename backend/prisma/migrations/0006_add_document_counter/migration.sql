-- DocumentCounter: atomic per-type sequential numbering for documents.
-- Seed each counter from the highest existing number so new numbers never collide.

CREATE TABLE "DocumentCounter" (
    "type" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("type")
);

INSERT INTO "DocumentCounter" ("type", "nextNumber", "updatedAt")
SELECT "type",
       COALESCE(MAX((regexp_split_to_array("documentNumber", '-'))[2]::INTEGER), 0) + 1,
       CURRENT_TIMESTAMP
FROM "Document"
GROUP BY "type";

-- Ensure all known types have a counter row even if no document exists yet.
INSERT INTO "DocumentCounter" ("type", "nextNumber", "updatedAt")
VALUES
    ('QUOTE', 1, CURRENT_TIMESTAMP),
    ('INVOICE', 1, CURRENT_TIMESTAMP),
    ('RECEIPT', 1, CURRENT_TIMESTAMP),
    ('PROFORMA_INVOICE', 1, CURRENT_TIMESTAMP),
    ('TAX_INVOICE', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("type") DO NOTHING;