# 04. Permissions

`CampaignMember.role` is `"dm"` | `"player"`. `requireCombatActor` in `src/actions/combat.ts` already returns `{ actor, isDm, pcPlanId }`. Every new action goes through it. "Own PC" means `CampaignPc.userId === actor.userId` for the combatant's `pcPlanId`.

## Capability matrix

| Action | DM | Player (own PC) | Player (other) |
|---|---|---|---|
| Start / end / reset combat | yes | no | no |
| Next actor, set active actor | yes | no | no |
| Roll initiative for all / NPCs | yes | no | no |
| Roll own initiative (writes init) | any row | own PC | no |
| Edit init, delay, ready | yes | own PC (delay/ready only) | no |
| Add / remove combatants, encounters | yes | no | no |
| Toggle visible / identified / active | yes | no | no |
| Set faction | yes | no | no |
| Target / untarget | any actor | own PC (Phase 0: on own turn; Phase 3: any time) | no |
| Clear all targets | yes | own PC targets | no |
| Roll attack from tracker row | any row | own PC row or own sheet | no |
| Roll damage and apply to pending targets | any | own PC | no |
| Roll save for a row | any row | own PC | no |
| Answer a DM save request | n/a | own PC | no |
| Cast spell from row / sheet | any | own PC | no |
| Heal / temp HP / edit HP directly | yes | own PC (heal and temp only) | no |
| Add effect | any row | own PC row only | no |
| Remove / toggle effect | any | own PC row, non-system, non-gm effects | no |
| Edit defenses | yes | no | no |
| Modifier stack | local to each user | local | local |
| Undo an event | yes | no | no |
| View combat log | all events | filtered | filtered |

## Visibility rules

Apply in `combatView.ts` and `events/filter.ts` on the server. The client never redacts.

1. **HP:** exact numbers for DM and owning player; health band for everyone else (exists). Nonlethal is included in the band computation.
2. **`visibleToPlayers = false`:** omit the row from player snapshots and omit events where the actor or target is that row (players still see "Something hits Aria" as `actorName: null`, rendered as "Unknown").
3. **`identified = false`:** players see `name` replaced by a generic label ("Creature 1", stable per row) and no `attacks`, `defenses`, `snapshot`, or `stats`. Attack events still show hit/miss.
4. **Effects:** `visible` shown to all; `hidden` shown only on the target's owner and DM; `gm` shown only to DM. Players see effect **labels** only, never the components' numeric detail when the effect is on another creature.
5. **Defenses:** DM and owner. Players do not see DR or resistances, but the log says "Damage reduced" without the amount.
6. **Pending targets and pending crit:** actor's owner and DM.
7. **Events:** `visibility: "dm"` events are never sent to players. `all` events are rendered per viewer (numbers vs bands). Damage lines for players read "Goblin takes damage and is Heavy" instead of "takes 12".
8. **Rolls:** existing hidden-roll handling stays. If the DM rolls with hidden on, the roll shows as silhouette and the event is `visibility: "dm"`.

## Security checks on every write

1. `requireCombatActor(campaignId)`; require `ok`.
2. Load the combat row by `campaignId`; every combatant id in the input must belong to that combat.
3. Role check from the matrix. For own-PC checks compare `combatant.pcPlanId` to `CampaignPc` rows for the user (existing pattern in `toggleCombatTarget`).
4. Validate numeric inputs (`Number.isFinite`, clamp DC 0..99, damage 0..9999, modifier -99..99).
5. Validate effect strings: max 200 chars, parse with `parseEffect`; reject if zero components and no label.
6. Never accept client-provided faces or outcomes. The client sends intent only.
7. `advanceCombatTurn` must gain the DM check it lacks today.
