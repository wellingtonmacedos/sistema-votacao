CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_types_value_key" ON "document_types"("value");

INSERT INTO "document_types" ("id", "label", "value", "orderIndex", "isActive", "createdAt", "updatedAt")
VALUES
    ('doctype_ata', 'Ata Anterior', 'ATA_ANTERIOR', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_dispensa', 'Dispensa de Ata', 'DISPENSA_ATA', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_comunicado', 'Comunicado', 'COMUNICADO', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_oficio', 'Ofício', 'OFICIO', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_requerimento', 'Requerimento', 'REQUERIMENTO', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_projeto', 'Projeto', 'PROJETO', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_indicacao', 'Indicação', 'INDICACAO', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('doctype_mocao', 'Moção', 'MOCAO', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
