import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  countIcosahedralFacesWithSamples,
  generateFractalWorld,
  smokeAllProjections,
} from "./generate";
import {
  inverseMollweide,
  inverseSquare,
  inverseTransverseMercator,
} from "./projections";
import { measureEquirectWaterRatio, sampleGlobeHeight } from "./sampling";
import { DEFAULT_FRACTAL_INPUT } from "./types";

describe("fractal world", () => {
  it("equirectangular center maps near equator and prime meridian", () => {
    const width = 960;
    const height = 480;
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const geo = inverseSquare(cx, cy, width, height);
    assert.ok(geo);
    assert.ok(Math.abs(geo.lat) < 2, `lat ${geo.lat}`);
    assert.ok(Math.abs(geo.lon) < 2, `lon ${geo.lon}`);
  });

  it("transverse mercator fills the map and puts a pole on the midline", () => {
    const width = 960;
    const height = 480;
    const corner = inverseTransverseMercator(0, 0, width, height);
    assert.ok(corner, "corner should map onto the globe");
    const pole = inverseTransverseMercator(
      Math.floor(width / 4),
      Math.floor(height / 2),
      width,
      height,
    );
    assert.ok(pole);
    assert.ok(Math.abs(pole.lat - 90) < 2, `pole lat ${pole.lat}`);
    const center = inverseTransverseMercator(
      Math.floor(width / 2),
      Math.floor(height / 2),
      width,
      height,
    );
    assert.ok(center);
    assert.ok(Math.abs(center.lat) < 2, `center lat ${center.lat}`);
  });

  it("mollweide corner pixel is empty", () => {
    const width = 480;
    const height = 240;
    const geo = inverseMollweide(0, 0, width, height);
    assert.equal(geo, null);
  });

  it("equirect water ratio stays within 10 points of target", () => {
    const target = 60;
    const ratio = measureEquirectWaterRatio(42, target, 8, 4, 0);
    assert.ok(
      Math.abs(ratio - target) <= 10,
      `water ratio ${ratio} vs ${target}`,
    );
  });

  it("rotation 90 changes height at lon 0 on the equator", () => {
    const seed = 7;
    const lat = 0;
    const lon = 0;
    const h0 = sampleGlobeHeight(seed, lat, lon, 0, 4);
    const h90 = sampleGlobeHeight(seed, lat, lon, 90, 4);
    assert.notEqual(h0, h90);
  });

  it("icosahedral net covers at least 10 faces", () => {
    const faces = countIcosahedralFacesWithSamples(3, 240);
    assert.ok(faces >= 10, `faces sampled ${faces}`);
  });

  it("every projection renders without throwing", () => {
    smokeAllProjections(1);
    const rng = createSeededRng(1);
    const result = generateFractalWorld(DEFAULT_FRACTAL_INPUT, rng, 1);
    assert.ok(result.pixels.length === result.width * result.height * 4);
  });
});
