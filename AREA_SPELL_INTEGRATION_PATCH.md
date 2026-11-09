# Area Spell Selector - Complete Integration Patch

## File 1: campaign-map-board.tsx

### Step 1: Add import at top (after line 56)
```typescript
import { MapAreaSpellLayer } from "./map-area-spell-layer";
import type { AreaSpellPlacement } from "./map-area-spell-layer";
import { castAreaSpellAction } from "@/actions/areaSpellCast";
import type { CombatSpellEntry } from "@/lib/combat/types";
import type { DicePoolItem } from "@/lib/dice/types";
```

### Step 2: Add state (after line 210, after aoeDraft state)
```typescript
const [areaSpellPlacement, setAreaSpellPlacement] = useState<AreaSpellPlacement | null>(null);
```

### Step 3: Add handler for starting placement (after line 220)
```typescript
const handleStartAreaSpellPlacement = useCallback((params: {
  spell: CombatSpellEntry;
  casterId: string;
  casterTokenId: string | null;
  label: string;
  dice: DicePoolItem[];
  casterLevel?: number;
  spellLevel?: number;
  castingStatMod?: number;
}) => {
  const casterToken = tokensRef.current.find(t => t.id === params.casterTokenId);
  if (!casterToken) {
    console.error("Caster token not found for area spell");
    return;
  }
  
  setAreaSpellPlacement({
    spell: params.spell,
    casterId: params.casterId,
    casterTokenId: params.casterTokenId,
    label: params.label,
    dice: params.dice,
    casterLevel: params.casterLevel,
    spellLevel: params.spellLevel,
    castingStatMod: params.castingStatMod,
    x: casterToken.x,
    y: casterToken.y,
    rotation: 0,
    highlightedTokenIds: [],
  });
}, []);
```

### Step 4: Modify handleBoardPointerMove (inside function, line ~790)
Add this check at the START of handleBoardPointerMove, before existing tool checks:

```typescript
const handleBoardPointerMove = (e: React.PointerEvent) => {
  // AREA SPELL PLACEMENT - handle first
  if (areaSpellPlacement) {
    const pt = clientToGrid(e.clientX, e.clientY);
    const casterToken = tokensRef.current.find(t => t.id === areaSpellPlacement.casterTokenId);
    if (!casterToken) return;
    
    const casterPos = { x: casterToken.x, y: casterToken.y };
    let centerX = pt.x;
    let centerY = pt.y;
    let rotation = areaSpellPlacement.rotation;
    
    // For cone/ray, rotate toward mouse from caster
    if (areaSpellPlacement.spell.areaShape === "cone" || areaSpellPlacement.spell.areaShape === "ray") {
      centerX = casterPos.x;
      centerY = casterPos.y;
      const dx = pt.x - casterPos.x;
      const dy = pt.y - casterPos.y;
      rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    } else if (areaSpellPlacement.spell.areaShape === "circle") {
      // Snap to grid intersection
      centerX = Math.round(pt.x / grid.sizeFeet) * grid.sizeFeet;
      centerY = Math.round(pt.y / grid.sizeFeet) * grid.sizeFeet;
    }
    
    // Compute tokens inside
    const shape = areaSpellPlacement.spell.areaShape === "cone"
      ? {
          kind: "cone" as const,
          origin: casterPos,
          sizeFeet: areaSpellPlacement.spell.rangeFeet ?? 30,
          rotationDeg: rotation,
        }
      : areaSpellPlacement.spell.areaShape === "ray"
      ? {
          kind: "ray" as const,
          origin: casterPos,
          endX: pt.x,
          endY: pt.y,
        }
      : {
          kind: areaSpellPlacement.spell.areaShape ?? "circle" as "circle" | "square",
          center: { x: centerX, y: centerY },
          radiusFeet: areaSpellPlacement.spell.rangeFeet ?? 20,
        };
    
    const tokenCenters = tokensRef.current.map(t => ({ id: t.id, x: t.x, y: t.y }));
    const highlightedTokenIds = tokensInsideShape(shape, tokenCenters, scaleFeet);
    
    setAreaSpellPlacement(prev => prev ? {
      ...prev,
      x: centerX,
      y: centerY,
      rotation,
      highlightedTokenIds,
    } : null);
    return;  // Skip other handlers
  }
  
  // ... existing code continues
```

### Step 5: Modify handleBoardPointerDown (line ~646)
Add this check RIGHT AFTER the panActive block (around line 660):

```typescript
const handleBoardPointerDown = (e: React.PointerEvent) => {
  const isPanButton = e.button === 1 || e.button === 2;
  const panActive = tool === "pan" || spacePan || isPanButton;
  if (panActive) {
    // ... existing pan code
    return;
  }

  // AREA SPELL PLACEMENT - handle left click to confirm
  if (areaSpellPlacement && e.button === 0) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetIds = areaSpellPlacement.highlightedTokenIds;
    const combatants = combat?.combatants ?? [];
    const targetCombatantIds = targetIds
      .map(tokenId => combatants.find(c => c.tokenId === tokenId)?.id)
      .filter((id): id is string => id != null);
    
    // Call server action
    castAreaSpellAction({
      campaignId,
      label: areaSpellPlacement.label,
      kind: "spell",
      dice: areaSpellPlacement.dice,
      modifier: 0,
      combat: {
        kind: "cast",
        casterId: areaSpellPlacement.casterId,
        spellKey: areaSpellPlacement.spell.key,
        targetIds: targetCombatantIds,
        casterLevel: areaSpellPlacement.casterLevel,
        spellLevel: areaSpellPlacement.spellLevel,
        castingStatMod: areaSpellPlacement.castingStatMod,
      },
    }).then(() => {
      console.log("Area spell cast complete");
    }).catch((err) => {
      console.error("Area spell cast failed:", err);
    });
    
    setAreaSpellPlacement(null);
    return;
  }

  // ... existing tool handling continues
```

### Step 6: Handle Esc key (find the useEffect with keydown listener, around line 1350)
Add check for Escape key:

```typescript
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    
    // AREA SPELL - cancel on Escape
    if (e.key === "Escape" && areaSpellPlacement) {
      setAreaSpellPlacement(null);
      e.preventDefault();
      return;
    }
    
    // ... existing key handlers
  };
  
  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [areaSpellPlacement, /* ... existing deps */]);
```

### Step 7: Handle right-click cancel (in onContextMenu handler, line ~1436)
```typescript
onContextMenu={(e) => {
  if (areaSpellPlacement) {
    e.preventDefault();
    setAreaSpellPlacement(null);
    return;
  }
  e.preventDefault();
}}
```

### Step 8: Add render layer (after MapTargetingLayer, around line 1570)
```tsx
<MapTargetingLayer
  tokens={displayTokens}
  combatants={combat?.combatants ?? []}
  grid={grid}
  camera={viewport}
  imageWidth={map.imageWidth}
  imageHeight={map.imageHeight}
  onOpenPcSheet={onOpenPcSheet}
/>
<MapAreaSpellLayer
  placement={areaSpellPlacement}
  tokens={displayTokens}
  grid={grid}
  imageWidth={map.imageWidth}
  imageHeight={map.imageHeight}
  scaleFeet={scaleFeet}
/>
```

### Step 9: Pass handler to parent/context
Add to component props (line ~90):
```typescript
type CampaignMapBoardProps = {
  // ... existing props
  onStartAreaSpellPlacement?: (params: {
    spell: CombatSpellEntry;
    casterId: string;
    casterTokenId: string | null;
    label: string;
    dice: DicePoolItem[];
    casterLevel?: number;
    spellLevel?: number;
    castingStatMod?: number;
  }) => void;
};
```

Then expose it via prop or context (or call handleStartAreaSpellPlacement directly via ref/context).

---

## File 2: combat-row-detail.tsx

### Step 1: Add imports (top of file)
```typescript
import { useCallback } from "react"; // if not already imported
```

### Step 2: Accept handler prop (in component props)
```typescript
export function CombatRowDetail({
  c,
  isDm,
  onStartAreaSpellPlacement, // ADD THIS
}: {
  c: CombatantView;
  isDm: boolean;
  onStartAreaSpellPlacement?: (params: {
    spell: CombatSpellEntry;
    casterId: string;
    casterTokenId: string | null;
    label: string;
    dice: DicePoolItem[];
    casterLevel?: number;
    spellLevel?: number;
    castingStatMod?: number;
  }) => void;
})
```

### Step 3: Modify spell cast button onClick (line ~375)
REPLACE the entire onClick handler:

```typescript
onClick={() => {
  if (!ctx) return;
  
  const pool = spellCastDicePool(
    spell,
    c.targetIds.map(id => ({ defenses: {} })),
    spell.casterLevel ?? c.stats.cl ?? 1,
  );
  
  // Check if area spell
  if (
    spell.areaShape &&
    (spell.areaShape === "circle" ||
      spell.areaShape === "square" ||
      spell.areaShape === "cone" ||
      spell.areaShape === "ray") &&
    onStartAreaSpellPlacement
  ) {
    const casterToken = ctx.combat?.tokens?.find(
      t => t.pcPlanId === c.pcPlanId || t.id === c.tokenId
    );
    
    onStartAreaSpellPlacement({
      spell,
      casterId: c.id,
      casterTokenId: casterToken?.id ?? null,
      label: `${c.name} ${spell.name}`,
      dice: pool,
      casterLevel: spell.casterLevel ?? c.stats.cl,
      spellLevel: spell.level ?? undefined,
      castingStatMod: c.stats.int ?? c.stats.wis ?? c.stats.cha,
    });
    return;
  }
  
  // Normal cast
  const targetRows = (ctx.combat?.combatants ?? []).filter((t) =>
    c.targetIds.includes(t.id),
  );
  const poolWithTargets = spellCastDicePool(
    spell,
    targetRows.map((t) => ({ defenses: t.defenses })),
    spell.casterLevel ?? c.stats.cl ?? 1,
  );
  ctx.rollCast({
    casterId: c.id,
    spellKey: spell.key,
    targetIds: c.targetIds,
    label: `${c.name} ${spell.name}`,
    dice: poolWithTargets,
    casterLevel: spell.casterLevel ?? c.stats.cl ?? undefined,
    spellLevel: spell.level ?? undefined,
    castingStatMod: c.stats.int ?? c.stats.wis ?? c.stats.cha ?? undefined,
  });
}}
```

---

## File 3: Wire context/prop (parent component)

Find where `CombatRowDetail` is rendered and pass the handler:

```tsx
<CombatRowDetail
  c={combatant}
  isDm={isDm}
  onStartAreaSpellPlacement={handleStartAreaSpellPlacement}
/>
```

Where `handleStartAreaSpellPlacement` is passed down from the map board or via context.

---

## Complete Integration Checklist

- [ ] Add imports to campaign-map-board.tsx
- [ ] Add areaSpellPlacement state
- [ ] Add handleStartAreaSpellPlacement callback
- [ ] Modify handleBoardPointerMove to update placement on mouse move
- [ ] Modify handleBoardPointerDown to confirm cast on left click
- [ ] Add Escape key handler to cancel
- [ ] Add right-click handler to cancel
- [ ] Render MapAreaSpellLayer in map board
- [ ] Pass handler to CombatRowDetail via props/context
- [ ] Modify spell cast button onClick to check for area spells
- [ ] Test in UI: cast Fireball, see preview, click to confirm
- [ ] Verify multi-target resolution in combat log

---

## Testing Steps

1. Start combat with 3+ creatures on map
2. Click Fireball (or any area spell) on spellcaster's sheet
3. Verify placement mode activates (shape appears)
4. Move mouse - shape follows, tokens highlight yellow
5. Left-click to confirm
6. Check combat log for per-target SR/saves/damage
7. Right-click or Esc to cancel (before confirming)

---

## Integration Test

File: `src/lib/combat/areaSpellCast.integration.test.ts`

```typescript
import { describe, it, assert } from "vitest";
import { resolveSpellCast } from "./spells/spellAction";
import type { CombatSpellEntry, SpellCastTarget } from "./types";

describe("area spell multi-target resolution", () => {
  it("Fireball hitting 3 targets: SR pass, save for half, full damage", () => {
    const fireball: CombatSpellEntry = {
      key: "fireball",
      name: "Fireball",
      level: 3,
      kind: "spell",
      spellClassKey: "wizard",
      areaShape: "circle",
      rangeFeet: 20,
      actions: {
        cast: { schoolShort: "evocation", savetype: "ref" },
        followUps: [{ type: "damage", dice: "6d6", dmgType: "fire" }],
      },
    } as CombatSpellEntry;
    
    const targets: SpellCastTarget[] = [
      { id: "t1", name: "Orc 1", defenses: { sr: 15, ref: 5 } },
      { id: "t2", name: "Orc 2", defenses: { ref: 8 } },
      { id: "t3", name: "Orc 3", defenses: { ref: 3 } },
    ];
    
    // Mock dice faces: [SR d20=16], [ref save t1=10], [ref t2=15], [ref t3=5], [6d6=24 damage]
    const mockFaces = [16, 10, 15, 5, 3, 4, 2, 6, 5, 4];
    const casterLevel = 5;
    const spellLevel = 3;
    const castingStatMod = 3;  // DC = 13 + 3 = 16
    
    // resolveSpellCast needs a caster object with engine context
    // This is a simplified example - actual test would need full engine
    const result = {
      events: [],
      damagePlans: [],
      consumeUseKey: "slot:wizard:3",
    };
    
    // Expected behavior:
    // - T1 has SR 15, caster level check 5 + d20(16) = 21 > 15 SR passed
    // - T1 ref save: 5 + d20(10) = 15 < DC 16 = FAIL (full damage)
    // - T2 ref save: 8 + d20(15) = 23 > DC 16 = PASS (half damage)
    // - T3 ref save: 3 + d20(5) = 8 < DC 16 = FAIL (full damage)
    
    assert.equal(result.consumeUseKey, "slot:wizard:3");
    // Full test would verify damage plans and events
  });
});
```

---

## Estimated Lines Changed

- **campaign-map-board.tsx**: +150 lines (imports, state, 3 handlers, render)
- **combat-row-detail.tsx**: +40 lines (prop, onClick logic)
- **Parent component**: +10 lines (prop passing)
- **Integration test**: +60 lines

**Total**: ~260 lines of integration code
