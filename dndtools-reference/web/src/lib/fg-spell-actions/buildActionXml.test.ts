import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSpellActionsXml } from "./buildActionXml";

describe("buildSpellActionsXml", () => {
  it("emits cast + damage for Inflict Light Wounds pattern", () => {
    const xml = buildSpellActionsXml(
      {
        cast: {
          othertags: "negative; one; ",
          schoolShort: "necromancy",
          savetype: "will",
        },
        action2: {
          type: "damage",
          dice: "d8",
          bonus: 0,
          dicestat: "cl",
          dicestatmax: 5,
          dmgType: "negative",
        },
      },
      3,
    );
    assert.match(xml, /<type type="string">cast<\/type>/);
    assert.match(xml, /<savetype type="string">will<\/savetype>/);
    assert.match(xml, /<type type="string">damage<\/type>/);
    assert.match(xml, /<dice type="dice">d8<\/dice>/);
    assert.match(xml, /<dicestat type="string">cl<\/dicestat>/);
    assert.match(xml, /<dicestatmax type="number">5<\/dicestatmax>/);
    assert.match(xml, /<type type="string">negative<\/type>/);
  });

  it("emits cast + effect for Flare pattern", () => {
    const xml = buildSpellActionsXml(
      {
        cast: {
          othertags: "light; zero; ",
          schoolShort: "evocation",
          savetype: "fort",
        },
        action2: {
          type: "effect",
          label: "Dazzled",
          durmod: 1,
          durunit: "minute",
        },
      },
      0,
    );
    assert.match(xml, /<label type="string">Dazzled<\/label>/);
    assert.match(xml, /<durunit type="string">minute<\/durunit>/);
    assert.match(xml, /<type type="string">effect<\/type>/);
  });

  it("emits cast + heal for Cure Moderate pattern", () => {
    const xml = buildSpellActionsXml(
      {
        cast: {
          othertags: "healing; two; harmless; ",
          schoolShort: "conjuration",
          srnotallowed: true,
        },
        followUps: [{ type: "heal", dice: "2d8", statmax: 10, statmult: 1 }],
      },
      3,
    );
    assert.match(xml, /<type type="string">heal<\/type>/);
    assert.match(xml, /<dice type="dice">2d8<\/dice>/);
    assert.match(xml, /<statmax type="number">10<\/statmax>/);
  });
});
