import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLogThrottle } from "./log-throttle";

describe("createLogThrottle", () => {
  it("logs the first occurrence of a key", () => {
    const throttle = createLogThrottle(30_000, () => 0);
    assert.equal(throttle.shouldLog("redis:ECONNREFUSED"), true);
  });

  it("suppresses repeats inside the window", () => {
    let time = 0;
    const throttle = createLogThrottle(30_000, () => time);
    assert.equal(throttle.shouldLog("k"), true);
    time = 29_999;
    assert.equal(throttle.shouldLog("k"), false);
  });

  it("logs again once the window has passed", () => {
    let time = 0;
    const throttle = createLogThrottle(30_000, () => time);
    assert.equal(throttle.shouldLog("k"), true);
    time = 30_000;
    assert.equal(throttle.shouldLog("k"), true);
  });

  it("tracks each key separately", () => {
    const throttle = createLogThrottle(30_000, () => 0);
    assert.equal(throttle.shouldLog("a"), true);
    assert.equal(throttle.shouldLog("b"), true);
    assert.equal(throttle.shouldLog("a"), false);
  });

  it("caps tracked keys so unique messages cannot grow memory", () => {
    const throttle = createLogThrottle(30_000, () => 0);
    for (let i = 0; i < 200; i += 1) {
      throttle.shouldLog(`key-${i}`);
    }
    // The 201st key clears the table, so an earlier key logs again.
    assert.equal(throttle.shouldLog("key-201"), true);
    assert.equal(throttle.shouldLog("key-0"), true);
  });
});
