import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  finalizeShopName,
  matchesSpecializedShopType,
  refreshShopNameForKeeper,
  rollStockCount,
  sectionRng,
  type CompendiumItem,
} from "@/lib/magic-shop";

describe("magic shop stock count", () => {
  it("thorp stock count is between 1 and 4 for 30 seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = sectionRng(seed, "items");
      const count = rollStockCount("thorp", rng);
      assert.ok(count >= 1 && count <= 4, `seed ${seed} count ${count}`);
    }
  });

  it("metropolis stock count is between 6 and 24 for 30 seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = sectionRng(seed, "items");
      const count = rollStockCount("metropolis", rng);
      assert.ok(count >= 6 && count <= 24, `seed ${seed} count ${count}`);
    }
  });
});

describe("magic shop keeper names", () => {
  const keeper = "A lanky halfling cutler named Mira wraps purchases in oiled cloth.";

  it("applies {keeper} in shop name patterns", () => {
    const { shopName } = finalizeShopName("{keeper}'s Reliquary", keeper);
    assert.equal(shopName, "Mira's Reliquary");
    assert.ok(!shopName.includes("{keeper}"));
  });

  it("leaves The names unchanged when the keeper rerolls", () => {
    const first = finalizeShopName("The Gilded Vial", keeper);
    const nextKeeper =
      "A steady human bladesmith named Corvin tests balance by resting each weapon on one finger.";
    const updated = refreshShopNameForKeeper(
      first.shopNamePattern,
      first.shopName,
      nextKeeper,
    );
    assert.equal(updated, "The Gilded Vial");
  });
});

describe("armorer item filter", () => {
  const fakeItems: CompendiumItem[] = [
    {
      slug: "shield-plus-one",
      name: "Shield +1",
      itemType: "Shield",
      price: "1,000 gp",
    },
    {
      slug: "longsword-plus-one",
      name: "Longsword +1",
      itemType: "Weapon",
      price: "2,000 gp",
    },
    {
      slug: "mystery-cloak",
      name: "Traveler's Cloak",
      itemType: null,
      price: "500 gp",
    },
    {
      slug: "chain-shirt",
      name: "Chain shirt +1",
      itemType: "",
      price: "800 gp",
    },
  ];

  it("keeps armor and shield matches out of unrelated types", () => {
    for (const item of fakeItems) {
      const matches = matchesSpecializedShopType(item, "armorer");
      if (item.slug === "longsword-plus-one" || item.slug === "mystery-cloak") {
        assert.equal(matches, false);
      } else {
        assert.equal(matches, true);
      }
    }
  });
});
