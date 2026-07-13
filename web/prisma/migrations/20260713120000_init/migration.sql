-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('CLERIC', 'PSIONIC_DISCIPLINE');

-- CreateEnum
CREATE TYPE "EntityCategory" AS ENUM ('SPELL', 'FEAT', 'MONSTER', 'TEMPLATE', 'CLASS', 'SKILL', 'EQUIPMENT', 'ITEM', 'RACE', 'DEITY', 'DOMAIN', 'PSIONIC', 'RULE');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbrev" TEXT,
    "edition" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "school" TEXT,
    "castingTime" TEXT,
    "components" TEXT,
    "range" TEXT,
    "minLevel" INTEGER,
    "target" TEXT,
    "duration" TEXT,
    "savingThrow" TEXT,
    "spellResistance" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feat" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "featType" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Feat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "creatureType" TEXT,
    "subtypes" TEXT,
    "challengeRating" TEXT,
    "hitDice" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "templateType" TEXT,
    "crChange" TEXT,
    "levelAdjustment" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "hitDie" TEXT,
    "skillPoints" TEXT,
    "isPrestige" BOOLEAN NOT NULL DEFAULT false,
    "searchVector" tsvector,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "keyAbility" TEXT,
    "trainedOnly" BOOLEAN,
    "armorCheckPenalty" BOOLEAN,
    "searchVector" tsvector,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "kind" TEXT,
    "category" TEXT,
    "cost" TEXT,
    "weight" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "itemType" TEXT,
    "price" TEXT,
    "casterLevel" TEXT,
    "aura" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "size" TEXT,
    "creatureType" TEXT,
    "levelAdjustment" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "alignment" TEXT,
    "pantheon" TEXT,
    "portfolio" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Deity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "grantedPowerHtml" TEXT,
    "grantedPowerText" TEXT,
    "domainType" "DomainType" NOT NULL DEFAULT 'CLERIC',
    "searchVector" tsvector,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Psionic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "powerPoints" TEXT,
    "discipline" TEXT,
    "manifestingTime" TEXT,
    "range" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Psionic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "indexData" JSONB NOT NULL DEFAULT '{}',
    "descriptionHtml" TEXT,
    "descriptionText" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "searchVector" tsvector,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellClassLevel" (
    "id" TEXT NOT NULL,
    "spellId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "SpellClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellDomain" (
    "id" TEXT NOT NULL,
    "spellId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "SpellDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainSpell" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "spellId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "DomainSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsionicClassLevel" (
    "id" TEXT NOT NULL,
    "psionicId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "PsionicClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsionicDiscipline" (
    "id" TEXT NOT NULL,
    "psionicId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "level" INTEGER,

    CONSTRAINT "PsionicDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterFeat" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "featId" TEXT NOT NULL,

    CONSTRAINT "MonsterFeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterAbility" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,

    CONSTRAINT "MonsterAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSampleMonster" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "monsterId" TEXT,
    "sampleName" TEXT,

    CONSTRAINT "TemplateSampleMonster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnresolvedRef" (
    "id" TEXT NOT NULL,
    "fromCategory" "EntityCategory" NOT NULL,
    "fromSlug" TEXT NOT NULL,
    "toCategory" "EntityCategory" NOT NULL,
    "toSlug" TEXT,
    "toExternalId" INTEGER,
    "field" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnresolvedRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "recordCounts" JSONB NOT NULL DEFAULT '{}',
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_abbrev_idx" ON "Source"("abbrev");

-- CreateIndex
CREATE INDEX "Source_edition_idx" ON "Source"("edition");

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_abbrev_edition_key" ON "Source"("name", "abbrev", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_slug_key" ON "Spell"("slug");

-- CreateIndex
CREATE INDEX "Spell_sourceId_idx" ON "Spell"("sourceId");

-- CreateIndex
CREATE INDEX "Spell_school_idx" ON "Spell"("school");

-- CreateIndex
CREATE INDEX "Spell_name_idx" ON "Spell"("name");

-- CreateIndex
CREATE INDEX "Spell_externalId_idx" ON "Spell"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Feat_slug_key" ON "Feat"("slug");

-- CreateIndex
CREATE INDEX "Feat_sourceId_idx" ON "Feat"("sourceId");

-- CreateIndex
CREATE INDEX "Feat_featType_idx" ON "Feat"("featType");

-- CreateIndex
CREATE INDEX "Feat_name_idx" ON "Feat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_slug_key" ON "Monster"("slug");

-- CreateIndex
CREATE INDEX "Monster_sourceId_idx" ON "Monster"("sourceId");

-- CreateIndex
CREATE INDEX "Monster_creatureType_idx" ON "Monster"("creatureType");

-- CreateIndex
CREATE INDEX "Monster_challengeRating_idx" ON "Monster"("challengeRating");

-- CreateIndex
CREATE INDEX "Monster_name_idx" ON "Monster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_sourceId_idx" ON "Template"("sourceId");

-- CreateIndex
CREATE INDEX "Template_name_idx" ON "Template"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_slug_key" ON "classes"("slug");

-- CreateIndex
CREATE INDEX "classes_sourceId_idx" ON "classes"("sourceId");

-- CreateIndex
CREATE INDEX "classes_name_idx" ON "classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_sourceId_idx" ON "Skill"("sourceId");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_slug_key" ON "Equipment"("slug");

-- CreateIndex
CREATE INDEX "Equipment_sourceId_idx" ON "Equipment"("sourceId");

-- CreateIndex
CREATE INDEX "Equipment_kind_idx" ON "Equipment"("kind");

-- CreateIndex
CREATE INDEX "Equipment_name_idx" ON "Equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE INDEX "Item_sourceId_idx" ON "Item"("sourceId");

-- CreateIndex
CREATE INDEX "Item_itemType_idx" ON "Item"("itemType");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Race_slug_key" ON "Race"("slug");

-- CreateIndex
CREATE INDEX "Race_sourceId_idx" ON "Race"("sourceId");

-- CreateIndex
CREATE INDEX "Race_name_idx" ON "Race"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Deity_slug_key" ON "Deity"("slug");

-- CreateIndex
CREATE INDEX "Deity_sourceId_idx" ON "Deity"("sourceId");

-- CreateIndex
CREATE INDEX "Deity_pantheon_idx" ON "Deity"("pantheon");

-- CreateIndex
CREATE INDEX "Deity_name_idx" ON "Deity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");

-- CreateIndex
CREATE INDEX "Domain_sourceId_idx" ON "Domain"("sourceId");

-- CreateIndex
CREATE INDEX "Domain_domainType_idx" ON "Domain"("domainType");

-- CreateIndex
CREATE INDEX "Domain_name_idx" ON "Domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Psionic_slug_key" ON "Psionic"("slug");

-- CreateIndex
CREATE INDEX "Psionic_sourceId_idx" ON "Psionic"("sourceId");

-- CreateIndex
CREATE INDEX "Psionic_discipline_idx" ON "Psionic"("discipline");

-- CreateIndex
CREATE INDEX "Psionic_name_idx" ON "Psionic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_slug_key" ON "Rule"("slug");

-- CreateIndex
CREATE INDEX "Rule_sourceId_idx" ON "Rule"("sourceId");

-- CreateIndex
CREATE INDEX "Rule_category_idx" ON "Rule"("category");

-- CreateIndex
CREATE INDEX "Rule_name_idx" ON "Rule"("name");

-- CreateIndex
CREATE INDEX "SpellClassLevel_classId_idx" ON "SpellClassLevel"("classId");

-- CreateIndex
CREATE INDEX "SpellClassLevel_level_idx" ON "SpellClassLevel"("level");

-- CreateIndex
CREATE UNIQUE INDEX "SpellClassLevel_spellId_classId_key" ON "SpellClassLevel"("spellId", "classId");

-- CreateIndex
CREATE INDEX "SpellDomain_domainId_idx" ON "SpellDomain"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellDomain_spellId_domainId_key" ON "SpellDomain"("spellId", "domainId");

-- CreateIndex
CREATE INDEX "DomainSpell_spellId_idx" ON "DomainSpell"("spellId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainSpell_domainId_position_key" ON "DomainSpell"("domainId", "position");

-- CreateIndex
CREATE INDEX "PsionicClassLevel_classId_idx" ON "PsionicClassLevel"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "PsionicClassLevel_psionicId_classId_key" ON "PsionicClassLevel"("psionicId", "classId");

-- CreateIndex
CREATE INDEX "PsionicDiscipline_domainId_idx" ON "PsionicDiscipline"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "PsionicDiscipline_psionicId_domainId_key" ON "PsionicDiscipline"("psionicId", "domainId");

-- CreateIndex
CREATE INDEX "MonsterFeat_featId_idx" ON "MonsterFeat"("featId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterFeat_monsterId_featId_key" ON "MonsterFeat"("monsterId", "featId");

-- CreateIndex
CREATE INDEX "MonsterAbility_ruleId_idx" ON "MonsterAbility"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterAbility_monsterId_ruleId_key" ON "MonsterAbility"("monsterId", "ruleId");

-- CreateIndex
CREATE INDEX "TemplateSampleMonster_monsterId_idx" ON "TemplateSampleMonster"("monsterId");

-- CreateIndex
CREATE INDEX "UnresolvedRef_fromCategory_fromSlug_idx" ON "UnresolvedRef"("fromCategory", "fromSlug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feat" ADD CONSTRAINT "Feat_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deity" ADD CONSTRAINT "Deity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Psionic" ADD CONSTRAINT "Psionic_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellClassLevel" ADD CONSTRAINT "SpellClassLevel_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellClassLevel" ADD CONSTRAINT "SpellClassLevel_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellDomain" ADD CONSTRAINT "SpellDomain_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellDomain" ADD CONSTRAINT "SpellDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainSpell" ADD CONSTRAINT "DomainSpell_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainSpell" ADD CONSTRAINT "DomainSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsionicClassLevel" ADD CONSTRAINT "PsionicClassLevel_psionicId_fkey" FOREIGN KEY ("psionicId") REFERENCES "Psionic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsionicClassLevel" ADD CONSTRAINT "PsionicClassLevel_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsionicDiscipline" ADD CONSTRAINT "PsionicDiscipline_psionicId_fkey" FOREIGN KEY ("psionicId") REFERENCES "Psionic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsionicDiscipline" ADD CONSTRAINT "PsionicDiscipline_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterFeat" ADD CONSTRAINT "MonsterFeat_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterFeat" ADD CONSTRAINT "MonsterFeat_featId_fkey" FOREIGN KEY ("featId") REFERENCES "Feat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAbility" ADD CONSTRAINT "MonsterAbility_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAbility" ADD CONSTRAINT "MonsterAbility_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSampleMonster" ADD CONSTRAINT "TemplateSampleMonster_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSampleMonster" ADD CONSTRAINT "TemplateSampleMonster_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

