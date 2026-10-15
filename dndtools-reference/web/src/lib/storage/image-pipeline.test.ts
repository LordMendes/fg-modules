import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertPixelCap, createSemaphore } from "./image-pipeline";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("createSemaphore", () => {
  it("never runs more tasks than its limit at once", async () => {
    const run = createSemaphore(2);
    let active = 0;
    let peak = 0;
    const task = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    };

    await Promise.all(Array.from({ length: 6 }, () => run(task)));

    assert.equal(peak, 2);
    assert.equal(active, 0);
  });

  it("starts queued tasks in arrival order", async () => {
    const run = createSemaphore(1);
    const started: number[] = [];
    const gate = deferred();

    const first = run(async () => {
      started.push(1);
      await gate.promise;
    });
    const second = run(async () => {
      started.push(2);
    });
    const third = run(async () => {
      started.push(3);
    });

    await new Promise((r) => setTimeout(r, 5));
    assert.deepEqual(started, [1]);

    gate.resolve();
    await Promise.all([first, second, third]);
    assert.deepEqual(started, [1, 2, 3]);
  });

  it("releases its slot when the task throws", async () => {
    const run = createSemaphore(1);

    await assert.rejects(
      run(async () => {
        throw new Error("boom");
      }),
      /boom/,
    );

    const result = await run(async () => "next");
    assert.equal(result, "next");
  });

  it("rejects a limit that is not a positive integer", () => {
    assert.throws(() => createSemaphore(0), RangeError);
    assert.throws(() => createSemaphore(1.5), RangeError);
  });
});

describe("assertPixelCap", () => {
  it("accepts an image exactly at the cap", () => {
    assert.doesNotThrow(() => assertPixelCap(400, 250, 100_000));
  });

  it("rejects an image over the cap", () => {
    assert.throws(() => assertPixelCap(401, 250, 100_000), /too large/);
  });

  it("rejects missing or zero dimensions", () => {
    assert.throws(() => assertPixelCap(undefined, 10, 100), /Invalid image dimensions/);
    assert.throws(() => assertPixelCap(10, 0, 100), /Invalid image dimensions/);
  });
});
