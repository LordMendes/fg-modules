import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { guardUpgradeSocket, rejectUpgrade } from "./liveWsUpgrade";

class FakeSocket extends EventEmitter {
  destroyCalls = 0;
  writes: string[] = [];

  destroy() {
    this.destroyCalls += 1;
    return this;
  }

  write(chunk: string) {
    this.writes.push(chunk);
    return true;
  }
}

describe("guardUpgradeSocket", () => {
  it("turns an early socket error into destroy plus callback", () => {
    const socket = new FakeSocket();
    const seen: string[] = [];
    guardUpgradeSocket(socket, (err) => seen.push(err.message));

    socket.emit("error", new Error("ECONNRESET"));

    assert.deepEqual(seen, ["ECONNRESET"]);
    assert.equal(socket.destroyCalls, 1);
  });

  it("removes its listener on release so ws can own errors", () => {
    const socket = new FakeSocket();
    const release = guardUpgradeSocket(socket, () => {});

    release();
    release();

    assert.equal(socket.listenerCount("error"), 0);
  });
});

describe("rejectUpgrade", () => {
  it("writes the status line, destroys, and swallows a late write error", () => {
    const socket = new FakeSocket();
    rejectUpgrade(socket, "HTTP/1.1 401 Unauthorized\r\n\r\n");

    assert.deepEqual(socket.writes, ["HTTP/1.1 401 Unauthorized\r\n\r\n"]);
    assert.equal(socket.destroyCalls, 1);
    assert.doesNotThrow(() => socket.emit("error", new Error("EPIPE")));
  });
});
