import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sweepHeartbeat, type HeartbeatSocket } from "./liveHeartbeat";

type FakeSocket = HeartbeatSocket & { pings: number; terminated: boolean };

function fakeSocket(readyState = 1): FakeSocket {
  const socket: FakeSocket = {
    readyState,
    pings: 0,
    terminated: false,
    ping() {
      socket.pings += 1;
    },
    terminate() {
      socket.terminated = true;
    },
  };
  return socket;
}

describe("sweepHeartbeat", () => {
  it("pings a socket that answered and terminates one that did not", () => {
    const answered = fakeSocket();
    const silent = fakeSocket();
    const alive = new WeakSet<FakeSocket>([answered]);

    sweepHeartbeat([answered, silent], alive);

    assert.equal(answered.pings, 1);
    assert.equal(answered.terminated, false);
    assert.equal(silent.pings, 0);
    assert.equal(silent.terminated, true);
  });

  it("requires a fresh pong before the next pass counts a socket as alive", () => {
    const socket = fakeSocket();
    const alive = new WeakSet<FakeSocket>([socket]);

    sweepHeartbeat([socket], alive);
    assert.equal(socket.terminated, false);

    // No pong arrived between the two passes.
    sweepHeartbeat([socket], alive);
    assert.equal(socket.terminated, true);
  });

  it("skips sockets that are not open", () => {
    const closing = fakeSocket(2);
    const alive = new WeakSet<FakeSocket>();

    sweepHeartbeat([closing], alive);

    assert.equal(closing.pings, 0);
    assert.equal(closing.terminated, false);
  });

  it("calls onAlive only for healthy sockets", () => {
    const healthy = fakeSocket();
    const silent = fakeSocket();
    const alive = new WeakSet<FakeSocket>([healthy]);
    const seen: FakeSocket[] = [];

    sweepHeartbeat([healthy, silent], alive, (client) => seen.push(client));

    assert.deepEqual(seen, [healthy]);
  });
});
