import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildLlmsFullTxt, buildLlmsTxt } from "./llms-txt";

const URL_PATTERN = /https?:\/\/[^\s)]+/g;

function urlsIn(text: string): string[] {
  return text.match(URL_PATTERN) ?? [];
}

function originOf(url: string): string {
  return new URL(url).origin;
}

describe("llms.txt hostname", () => {
  let previousSiteUrl: string | undefined;
  let previousPublicSiteUrl: string | undefined;

  beforeEach(() => {
    previousSiteUrl = process.env.SITE_URL;
    previousPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (previousSiteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSiteUrl;
    if (previousPublicSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousPublicSiteUrl;
  });

  it("uses SITE_URL for the homepage, spell catalog, tools, and Fireball example", () => {
    process.env.SITE_URL = "https://dnd-helper.com";
    const text = buildLlmsTxt();

    assert.ok(text.includes("- Home: https://dnd-helper.com\n"));
    assert.ok(text.includes("- Tools: https://dnd-helper.com/tools\n"));
    assert.ok(
      text.includes("- Spells: https://dnd-helper.com/spells (A-Z catalog: https://dnd-helper.com/catalog/spells)"),
    );
    assert.ok(text.includes("- Fireball spell: https://dnd-helper.com/spells/fireball\n"));
  });

  it("emits only the configured origin in llms.txt and llms-full.txt", () => {
    process.env.SITE_URL = "https://dnd-helper.com";

    for (const text of [buildLlmsTxt(), buildLlmsFullTxt()]) {
      const urls = urlsIn(text);
      assert.ok(urls.length > 0);
      for (const url of urls) {
        assert.equal(originOf(url), "https://dnd-helper.com", `unexpected host in ${url}`);
      }
      assert.ok(!text.includes("lcmendes"));
    }
  });

  it("follows SITE_URL instead of a hardcoded host", () => {
    process.env.SITE_URL = "https://staging.example.test";

    for (const text of [buildLlmsTxt(), buildLlmsFullTxt()]) {
      for (const url of urlsIn(text)) {
        assert.equal(originOf(url), "https://staging.example.test", `unexpected host in ${url}`);
      }
      assert.ok(!text.includes("dnd-helper"));
    }
  });

  it("normalizes a trailing slash and a missing scheme in SITE_URL", () => {
    process.env.SITE_URL = "dnd-helper.com/";
    const text = buildLlmsTxt();

    assert.ok(text.includes("- Home: https://dnd-helper.com\n"));
    assert.ok(!text.includes("https://dnd-helper.com//"));
  });

  it("points llms.txt at llms-full.txt on the same origin", () => {
    process.env.SITE_URL = "https://dnd-helper.com";

    assert.ok(buildLlmsTxt().includes("https://dnd-helper.com/llms-full.txt"));
  });
});
