import { describe, expect, it } from "vitest";
import { findExactNameMatch, findSymbolMatch } from "./importMatch";

describe("findExactNameMatch", () => {
  it("returns none when there's no candidate name", () => {
    expect(findExactNameMatch([{ name: "Chase Checking" }], undefined)).toEqual({ type: "none" });
  });

  it("returns none when nothing matches", () => {
    expect(findExactNameMatch([{ name: "Chase Checking" }], "Ally Savings")).toEqual({ type: "none" });
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    const items = [{ name: "Chase Checking" }];
    expect(findExactNameMatch(items, "  chase checking  ")).toEqual({ type: "match", item: items[0] });
  });

  it("reports ambiguous when 2+ items share the same name — never auto-picks one", () => {
    const items = [{ name: "Chase Checking", id: "a" }, { name: "Chase Checking", id: "b" }];
    expect(findExactNameMatch(items, "Chase Checking")).toEqual({ type: "ambiguous" });
  });
});

describe("findSymbolMatch", () => {
  it("returns none when there's no candidate symbol", () => {
    expect(findSymbolMatch([{ symbol: "AAPL" }], undefined)).toEqual({ type: "none" });
  });

  it("matches case-insensitively", () => {
    const items = [{ symbol: "AAPL" }];
    expect(findSymbolMatch(items, "aapl")).toEqual({ type: "match", item: items[0] });
  });

  it("reports ambiguous when 2+ holdings share the same symbol", () => {
    const items = [{ symbol: "AAPL", id: "a" }, { symbol: "AAPL", id: "b" }];
    expect(findSymbolMatch(items, "AAPL")).toEqual({ type: "ambiguous" });
  });
});
