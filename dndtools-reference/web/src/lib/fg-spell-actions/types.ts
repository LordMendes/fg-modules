/** Shared spell action types for NPC and spell FG export tools. */

export type SpellSaveType = 'fort' | 'reflex' | 'will'

export type SpellAtkType = 'rtouch' | 'mtouch' | 'ranged'

export interface SpellCastActionFields {
  othertags: string
  schoolShort: string
  savetype?: SpellSaveType | ''
  atktype?: SpellAtkType | ''
  onmissdamage?: 'half' | ''
  srnotallowed?: boolean
}

export interface SpellDamageAction {
  type: 'damage'
  dice: string
  bonus?: number
  dicestat?: 'cl' | 'halfcl' | ''
  dicestatmax?: number
  /** Energy or damage type in XML — `dmgType` in JSON, `dmg_type` in Python. */
  dmgType: string
}

export interface SpellHealAction {
  type: 'heal'
  dice: string
  statmax: number
  statmult?: number
}

export interface SpellEffectAction {
  type: 'effect'
  label: string
  durdice?: string
  durmod?: number
  durunit?: 'round' | 'minute' | 'hour' | 'day' | ''
}

export type SpellFollowUpAction = SpellDamageAction | SpellHealAction | SpellEffectAction

/** Cast metadata + optional follow-up actions for spellset XML. */
export interface SpellActionSet {
  cast: SpellCastActionFields
  followUps?: SpellFollowUpAction[]
  /** Shorthand: single follow-up (merged into followUps at build time). */
  action2?: SpellFollowUpAction
}
