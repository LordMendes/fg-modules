-- Phase 1: spell lists and remaining uses on combatants
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "spells" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "spellUses" JSONB NOT NULL DEFAULT '{}';
