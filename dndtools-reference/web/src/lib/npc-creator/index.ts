export type { NpcFgExportState, NpcFgSpellRow, MonsterTemplateDelta, ArchetypePreset } from "./types";
export { DEFAULT_NPC_FG_STATE, DEFAULT_SPELL_ROW, DEFAULT_MEDIA } from "./defaultState";
export { mergeNpcFgState, parseNpcFgJson } from "./mergeState";
export { buildNpcFgXml, buildMergedSpecialQualities, abilityModifier } from "./buildXml";
export { parseNpcFgXml } from "./parseNpcFgXml";
export { applyMonsterTemplate } from "./applyMonsterTemplate";
export { monsterDeltaToPatch } from "./monsterDeltaToPatch";
export {
  detectPatchConflicts,
  applyPatchWithChoices,
  autoApplyablePaths,
  flattenPatchLeaves,
  type FieldConflict,
  type ConflictChoice,
} from "./conflicts";
export { toSlug } from "./toSlug";
export { ARCHETYPE_PRESETS, getArchetypeById } from "./presets/archetypes";
export { LEVEL_PRESETS, getLevelPresetById } from "./presets/levels";
export { MONSTER_TEMPLATES, getMonsterTemplateById } from "./presets/monster-templates";
export { NPC_FG_SKILL_MARKDOWN } from "./skillCopyMarkdown";
export {
  loadUserTemplates,
  saveUserTemplate,
  renameUserTemplate,
  deleteUserTemplate,
  loadDraft,
  saveDraft,
  clearDraft,
  type UserNpcTemplate,
} from "./storage";
export { compressImageToDataUrl } from "./compressImage";
export { normalizeSkillPatch } from "./normalizeSkillPatch";
export {
  readFileAsDataUrl,
  renderTransformedImage,
  imageDrawRect,
  coverScale,
  DEFAULT_IMAGE_TRANSFORM,
  type ImageTransform,
} from "./imageTransform";
