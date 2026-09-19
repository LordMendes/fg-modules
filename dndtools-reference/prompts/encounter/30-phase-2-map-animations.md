# 30. Phase 2: map status and combat animations

**Prompt:** Implement this phase only, after Phase 1. Read `README.md`, `02-architecture.md`, `03-data-model.md`, `04-permissions.md`, `06-ui-ux.md` first, and the maps plan `prompts/maps/02-architecture.md` for coordinate and layer conventions.

## Goal

The battle map reflects combat state and shows what just happened. Tokens display HP bars and condition icons, dead and prone markers, and the current actor ring. Attacks, spells, damage, heals and effects animate from source to target, driven only by `combatEvent` messages so every client animates the same thing once. Targeting from the map gets a proper mode. Everything respects reduced motion and never blocks input.

## Constraints

- Keep the DOM/SVG/canvas layering of `campaign-map-board.tsx`. No new renderer, no WebGL.
- Animation library: none is present besides dice. Prefer CSS keyframes and SVG `<animate>` / `<animateMotion>`. If a JS animation lib is needed for sequencing, add **one** small dependency (`@react-spring/web` or `motion`) and use it only in `map-combat-fx-layer.tsx`. Do not spread it to the tracker.
- No assets in the repo larger than 50 KB for FX. Use vector shapes and CSS gradients. Sprite sheets are out.
- Animations are cosmetic. State changes come from snapshots; the FX layer never mutates state.

## User stories

1. As a player, I see a health bar under each token: exact ratio for my own PC, band color only for others (bar length quantized to the band, so players cannot read exact HP).
2. As anyone, I see small condition icons under tokens (prone, stunned, dying, ...) that match the tracker chips.
3. As anyone, when the goblin attacks the fighter, a short slash arc appears on the fighter's token and a "Miss" or "Hit 17" floater rises; on a crit the floater is larger and gold.
4. As anyone, when Fireball resolves, a burst expands from the pointer center over the area, and each target shows a red damage floater ("-13", or "Heavy" for players) and a brief shake.
5. As anyone, when a ray or arrow is fired, a projectile travels from the caster's token to the target and the result floater plays on arrival.
6. As anyone, healing shows a green rising floater and a soft pulse; a new effect shows its icon popping in on the token; an expired effect fades out.
7. As DM, I toggle Target mode (T) and click tokens to add or remove targets for the current actor without holding Ctrl.
8. With reduced motion on, floaters appear and fade with no movement, bursts are a single frame, projectiles are skipped.

## Implementation order

### 1. Token status (`map-token-status.tsx`)

- Render under each token that has a combatant: HP bar (`.map-token-hp`, 4px, band color from `--combat-band-*` tokens shared with `.combat-hp-status--*`), condition icon strip (max 4 then `+N`), `Dead` overlay (diagonal cross or skull lucide icon, token desaturated), `Prone` marker (rotated frame), `Dying` pulse.
- Data from `combatantByTokenId` (already in `combat-context.tsx`). Icons from `effects/presets.ts` (`icon` field added in Phase 0A).
- Current actor: existing ring or add `.map-token--active` glow. Targeted tokens keep the arrows.
- Hidden or unidentified handling: players never get the data, so nothing to hide client-side; DM gets an eye-off badge on hidden tokens (may already exist from maps Wave 2).

### 2. FX layer (`map-combat-fx-layer.tsx`)

- A sibling SVG layer above tokens and below the dice canvas, sized like `map-targeting-layer.tsx`, using the same grid to pixel helpers.
- Subscribes to `combatEvents` from `liveStore.ts` (Phase 0A ring buffer). Keeps a `lastSeq` and plays each new event once. Multiple events from one roll (attack + damage for two targets) are grouped by `rollId` and staggered 120ms.
- FX per kind:

| Event | FX |
|---|---|
| `attack` melee | short arc stroke over target (300ms), floater `Hit 17` / `Miss` / `Threat!` |
| `attack` ranged, `rtouch`, `cast` with ray | projectile: small circle with a trail along a straight line source -> target (250 to 450ms by distance), then the attack floater |
| `critConfirm` | gold flash ring on target, floater `Critical!` or `Not confirmed` |
| `damage` | red floater `-N` (DM/owner) or band word (players), 2px shake 200ms, bar animates to new length |
| `heal` / `tempHp` | green floater `+N`, soft green pulse |
| `save` | small shield icon with `Save` or `Fail` floater at target |
| `sr` | violet ring, `SR` floater |
| `cast` with area | burst: expanding circle/cone/square from the pointer center matching the AOE shape, 500ms, spell color by damage type (`fire` orange, `cold` blue, `acid` green, `electricity` yellow, `sonic` gray, `force` violet, `negative` purple, `positive` gold, untyped white) |
| `effectApply` | icon pops in under the token (scale 0 -> 1) |
| `effectExpire` / `effectRemove` | icon fades out |
| `death` | token desaturates and cross fades in |
| `turnStart` | camera does not move; the active ring transfers with a 200ms glow |

- Floaters: `.map-fx-floater` absolutely positioned in map pixels, translate up 24px and fade over 900ms. Text size scales with zoom so it stays readable (clamp 11px to 18px on screen).
- Colors as CSS variables `--fx-*` in `theme.css`. No hex in the component.
- `prefers-reduced-motion`: floaters fade in place, no shake, burst is a static ring for 400ms, projectiles skipped (result floater plays immediately).
- Cap: if more than 12 events arrive within one second (mass AOE), coalesce floaters per target into one and skip shakes.
- Off-screen targets: skip FX, still show floater at the viewport edge? No: skip entirely. Keep it simple.

### 3. Event payload needs

- Attack and damage payloads already include source and target ids. Add `sourceTokenId`, `targetTokenId`, and for area casts `area: { shape, centerX, centerY, radiusSquares, angle }` to the `cast` payload when the cast came from a pointer. Keep positions in grid squares like the rest of the map.

### 4. Target mode on the map

- Toolbar toggle **Target** (crosshair icon, key `T`). In target mode a click on a token toggles it as a target for the current actor (permission rules as the tracker). Ctrl+click still works in select mode.
- Right-click a token in target mode clears all targets (DM) or own targets.
- Arrows in `map-targeting-layer.tsx` gain arrowheads and a subtle dash when the target is out of reach (`distance > reachFeet` for melee actors) so the DM sees reach at a glance.

### 5. Drop onto tokens

- Tokens accept `CombatDragPayload` (from Phase 0B) so the DM can drag an attack or damage from the tracker onto a token. Same handler as rows.

### 6. Performance

- FX elements are removed from the DOM on animation end (`onAnimationEnd`), never accumulated.
- Do not re-render the whole board on each event: the FX layer holds its own state and reads token positions from a ref.

## Acceptance

- [ ] HP bars: owner sees exact ratio; other players see quantized band lengths (verify by comparing with the exact HP as DM).
- [ ] Condition icons match chips one to one (same preset table); `+N` after four.
- [ ] Dead token desaturated with cross; Prone marker visible; active ring follows Next actor.
- [ ] Melee attack: arc plus floater on the target; miss and hit differ; crit gold.
- [ ] Ranged attack and ray: projectile from source to target, result on arrival.
- [ ] Fireball from a pointer: burst matches the shape and size; each target shows a floater and shake; bars update after the burst starts.
- [ ] Heal green, effect icon pops in, expired icon fades.
- [ ] Two browsers show the same FX for the same event once each; a reload does not replay old events.
- [ ] Reduced motion: no movement, floaters still readable.
- [ ] Target mode toggles with T and click; Ctrl+click still works.
- [ ] Dragging damage from the tracker onto a token applies to that combatant.
- [ ] 20 goblins hit by an AOE: no dropped frames noticeable, DOM node count returns to baseline after 2 seconds.
- [ ] Map without combat renders exactly as before (no bars, no FX layer work).

## Out of this phase

Sound, screen shake of the whole board, token animations for movement, weather, lighting changes tied to spells (Daylight, Darkness) unless trivially a light entity toggle.

## Browser check

1. DM: encounter on a lit map, Start, Roll init.
2. DM: goblin melee on the fighter, ranged on the wizard. Watch both clients.
3. Wizard: Fireball on the goblins.
4. Cleric: heal the fighter; DM: Bless on the party; advance until Bless expires.
5. Kill a goblin; check the token.
6. Toggle reduced motion in the OS and repeat step 2.
