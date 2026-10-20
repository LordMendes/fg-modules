import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOOL_LICENSES } from "./tool-licenses";
import {
  filterTools,
  getTool,
  groupTools,
  TOOL_GROUPS,
  TOOLS,
} from "./tools";

describe("tools catalog", () => {
  it("lists every tool exactly once across groups", () => {
    const grouped = groupTools();
    const keys = grouped.flatMap((group) => group.tools.map((tool) => tool.key));
    assert.equal(keys.length, TOOLS.length);
    assert.equal(new Set(keys).size, TOOLS.length);
    assert.equal(grouped[0]?.id, "table");
    assert.deepEqual(
      grouped.map((group) => group.id),
      TOOL_GROUPS.filter((group) =>
        TOOLS.some((tool) => tool.group === group.id),
      ).map((group) => group.id),
    );
  });

  it("filters by label, source, and group name", () => {
    const byLabel = filterTools("automatic spell slot");
    assert.equal(byLabel.length, 1);
    assert.equal(byLabel[0]?.key, "pc-planner");

    const byGroup = groupTools(filterTools("building and costs"));
    assert.equal(byGroup.length, 1);
    assert.equal(byGroup[0]?.id, "building");
    assert.equal(byGroup[0]?.tools.length, 4);

    const empty = filterTools("xyzzy-not-a-tool");
    assert.deepEqual(empty, []);
  });

  it("license notices point at catalog tools", () => {
    for (const key of Object.keys(TOOL_LICENSES)) {
      assert.ok(getTool(key), `license notice for unknown tool ${key}`);
    }
  });

  it("hides empty groups after a search", () => {
    const grouped = groupTools(filterTools("dungeon"));
    assert.ok(grouped.every((group) => group.tools.length > 0));
    assert.ok(grouped.some((group) => group.id === "adventures"));
    assert.equal(
      grouped.some((group) => group.id === "table"),
      false,
    );
  });
});
