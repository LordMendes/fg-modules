import { escXml } from './escXml'
import type {
  SpellActionSet,
  SpellCastActionFields,
  SpellFollowUpAction,
} from './types'

function resolveFollowUps(set: SpellActionSet): SpellFollowUpAction[] {
  const list = [...(set.followUps ?? [])]
  if (set.action2) list.push(set.action2)
  return list
}

function buildFollowUpXml(action: SpellFollowUpAction, order: number, indent: string): string {
  const p = indent
  const lines: string[] = []
  const eid = `id-${String(order).padStart(5, '0')}`
  lines.push(`${p}<${eid}>`)
  lines.push(`${p}\t<order type="number">${order}</order>`)

  if (action.type === 'damage') {
    lines.push(`${p}\t<damagelist>`)
    lines.push(`${p}\t\t<id-00001>`)
    lines.push(`${p}\t\t\t<bonus type="number">${action.bonus ?? 0}</bonus>`)
    lines.push(`${p}\t\t\t<dice type="dice">${escXml(action.dice)}</dice>`)
    if (action.dicestat) {
      lines.push(`${p}\t\t\t<dicestat type="string">${escXml(action.dicestat)}</dicestat>`)
      lines.push(`${p}\t\t\t<dicestatmax type="number">${action.dicestatmax ?? 0}</dicestatmax>`)
    }
    lines.push(`${p}\t\t\t<type type="string">${escXml(action.dmgType)}</type>`)
    lines.push(`${p}\t\t</id-00001>`)
    lines.push(`${p}\t</damagelist>`)
    lines.push(`${p}\t<type type="string">damage</type>`)
  } else if (action.type === 'heal') {
    lines.push(`${p}\t<heallist>`)
    lines.push(`${p}\t\t<id-00001>`)
    lines.push(`${p}\t\t\t<dice type="dice">${escXml(action.dice)}</dice>`)
    lines.push(`${p}\t\t\t<stat type="string">cl</stat>`)
    lines.push(`${p}\t\t\t<statmax type="number">${action.statmax}</statmax>`)
    lines.push(`${p}\t\t\t<statmult type="number">${action.statmult ?? 1}</statmult>`)
    lines.push(`${p}\t\t</id-00001>`)
    lines.push(`${p}\t</heallist>`)
    lines.push(`${p}\t<type type="string">heal</type>`)
  } else {
    lines.push(`${p}\t<durdice type="dice">${escXml(action.durdice ?? '')}</durdice>`)
    lines.push(`${p}\t<durmod type="number">${action.durmod ?? 1}</durmod>`)
    lines.push(`${p}\t<durunit type="string">${escXml(action.durunit ?? 'round')}</durunit>`)
    lines.push(`${p}\t<label type="string">${escXml(action.label)}</label>`)
    lines.push(`${p}\t<type type="string">effect</type>`)
  }

  lines.push(`${p}</${eid}>`)
  return lines.join('\n')
}

function buildCastXml(
  cast: SpellCastActionFields,
  abilityMod: number,
  indent: string,
): string {
  const p = indent
  const lines: string[] = []
  lines.push(`${p}<id-00001>`)
  if (cast.atktype) {
    lines.push(`${p}\t<atktype type="string">${escXml(cast.atktype)}</atktype>`)
  }
  if (cast.onmissdamage) {
    lines.push(`${p}\t<onmissdamage type="string">${escXml(cast.onmissdamage)}</onmissdamage>`)
  }
  lines.push(`${p}\t<order type="number">1</order>`)
  lines.push(`${p}\t<othertags type="string">${escXml(cast.othertags)}</othertags>`)
  lines.push(`${p}\t<replacedcstatmod type="number">${abilityMod}</replacedcstatmod>`)
  if (cast.savetype) {
    lines.push(`${p}\t<savetype type="string">${escXml(cast.savetype)}</savetype>`)
  }
  lines.push(`${p}\t<school type="string">${escXml(cast.schoolShort)}</school>`)
  if (cast.srnotallowed) {
    lines.push(`${p}\t<srnotallowed type="number">1</srnotallowed>`)
  }
  lines.push(`${p}\t<stype type="string">spell</stype>`)
  lines.push(`${p}\t<type type="string">cast</type>`)
  lines.push(`${p}</id-00001>`)
  return lines.join('\n')
}

/** Build `<actions>...</actions>` block for a spellset spell entry. */
export function buildSpellActionsXml(
  set: SpellActionSet,
  abilityMod: number,
  indent = '\t\t\t\t\t\t',
): string {
  const followUps = resolveFollowUps(set)
  const lines: string[] = []
  const actionsIndent = indent
  lines.push(`${actionsIndent}<actions>`)
  lines.push(buildCastXml(set.cast, abilityMod, `${actionsIndent}\t`))
  followUps.forEach((fu, i) => {
    lines.push(buildFollowUpXml(fu, i + 2, `${actionsIndent}\t`))
  })
  lines.push(`${actionsIndent}</actions>`)
  return lines.join('\n')
}

/** Build cast-only actions (backward compatible). */
export function buildCastOnlyActionsXml(
  cast: SpellCastActionFields,
  abilityMod: number,
  indent = '\t\t\t\t\t\t',
): string {
  return buildSpellActionsXml({ cast }, abilityMod, indent)
}
