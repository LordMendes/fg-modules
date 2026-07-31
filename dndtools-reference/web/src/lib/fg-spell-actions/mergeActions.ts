import type {
  SpellAtkType,
  SpellEffectAction,
  SpellFollowUpAction,
} from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function normalizeAtktype(v: unknown): SpellAtkType | '' {
  const s = String(v ?? '').toLowerCase()
  if (s === 'rtouch' || s === 'mtouch' || s === 'ranged') return s
  return ''
}

function normalizeOnmiss(v: unknown): 'half' | '' {
  return String(v ?? '').toLowerCase() === 'half' ? 'half' : ''
}

function normalizeDurunit(v: unknown): SpellEffectAction['durunit'] {
  const s = String(v ?? 'round').toLowerCase()
  if (s === 'minute' || s === 'hour' || s === 'day' || s === 'round') return s
  if (s === '') return ''
  return 'round'
}

export function mergeFollowUpAction(v: unknown): SpellFollowUpAction | undefined {
  if (!isPlainObject(v)) return undefined
  const t = String(v.type ?? '').toLowerCase()
  if (t === 'damage') {
    const dice = String(v.dice ?? '')
    const dmgType = String(v.dmgType ?? v.dmg_type ?? 'untyped')
    if (!dice) return undefined
    return {
      type: 'damage',
      dice,
      bonus: typeof v.bonus === 'number' ? v.bonus : Number.parseInt(String(v.bonus ?? 0), 10) || 0,
      dicestat: v.dicestat === 'cl' || v.dicestat === 'halfcl' ? v.dicestat : '',
      dicestatmax: typeof v.dicestatmax === 'number' ? v.dicestatmax : undefined,
      dmgType,
    }
  }
  if (t === 'heal') {
    const dice = String(v.dice ?? '')
    if (!dice) return undefined
    return {
      type: 'heal',
      dice,
      statmax: typeof v.statmax === 'number' ? v.statmax : Number.parseInt(String(v.statmax ?? 5), 10) || 5,
      statmult: typeof v.statmult === 'number' ? v.statmult : 1,
    }
  }
  if (t === 'effect') {
    const label = String(v.label ?? '')
    if (!label) return undefined
    return {
      type: 'effect',
      label,
      durdice: String(v.durdice ?? ''),
      durmod: typeof v.durmod === 'number' ? v.durmod : 1,
      durunit: normalizeDurunit(v.durunit),
    }
  }
  return undefined
}

export function mergeFollowUpList(v: unknown): SpellFollowUpAction[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: SpellFollowUpAction[] = []
  for (const item of v) {
    const merged = mergeFollowUpAction(item)
    if (merged) out.push(merged)
  }
  return out.length ? out : undefined
}

export function mergeSpellActionFields(row: Record<string, unknown>): {
  atktype?: SpellAtkType | ''
  onmissdamage?: 'half' | ''
  action2?: SpellFollowUpAction
  actions?: SpellFollowUpAction[]
} {
  const out: {
    atktype?: SpellAtkType | ''
    onmissdamage?: 'half' | ''
    action2?: SpellFollowUpAction
    actions?: SpellFollowUpAction[]
  } = {}
  if (row.atktype !== undefined) out.atktype = normalizeAtktype(row.atktype)
  if (row.onmissdamage !== undefined) out.onmissdamage = normalizeOnmiss(row.onmissdamage)
  const action2 = mergeFollowUpAction(row.action2)
  if (action2) out.action2 = action2
  const actions = mergeFollowUpList(row.actions)
  if (actions) out.actions = actions
  return out
}
