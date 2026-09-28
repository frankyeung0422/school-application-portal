import { describe, expect, it } from "vitest";
import {
  FUZZY_MIN,
  candidateNeedles,
  didYouMean,
  editDistance,
  foldText,
  fuzzyScore,
  querySignature,
  rankFuzzy,
  scriptVariants,
  vocabulary,
} from "../lib/search/fuzzy";

const matches = (q: string, title: string) => fuzzyScore(q, title) >= FUZZY_MIN;

describe("foldText", () => {
  it("folds Traditional to Simplified so HK typing meets mainland titles", () => {
    expect(foldText("小米手環 藍牙耳機")).toBe(foldText("小米手环 蓝牙耳机"));
  });
  it("normalises full-width and case", () => {
    expect(foldText("ＸＩＡＯＭＩ Band")).toBe("xiaomi band");
  });
});

describe("fuzzy matching", () => {
  it("ignores word order", () => {
    expect(matches("band 9 xiaomi", "Xiaomi Smart Band 9 AMOLED Fitness Tracker")).toBe(true);
  });
  it("matches Traditional query to a Simplified title and vice versa", () => {
    expect(matches("小米手環", "小米手环9 NFC版")).toBe(true);
    expect(matches("維他奶", "维他奶 原味豆奶 250ml")).toBe(true);
    expect(matches("维他奶", "維他奶 麥精豆奶")).toBe(true);
  });
  it("bridges a Chinese query to an English title", () => {
    expect(matches("小米手環", "Xiaomi Smart Band 9")).toBe(true);
  });
  it("bridges an English query to a Chinese title", () => {
    expect(matches("xiaomi band", "小米手环9 智能运动")).toBe(true);
  });
  it("tolerates typos and plurals", () => {
    expect(matches("xiaomy band", "Xiaomi Smart Band 9")).toBe(true);
    expect(matches("airpod pro", "Apple AirPods Pro 2 USB-C")).toBe(true);
    expect(matches("headphone", "Sony WH-1000XM5 Wireless Headphones")).toBe(true);
    expect(matches("samsng galaxy", "Samsung Galaxy S24")).toBe(true);
  });
  it("uses synonyms, including HK words", () => {
    expect(matches("吸塵機", "Dyson V12 Detect Slim Vacuum")).toBe(true);
    expect(matches("尿袋", "Anker PowerBank 10000mAh")).toBe(true);
    expect(matches("earbuds", "Soundcore 无线蓝牙耳机")).toBe(true);
  });
  it("does not let a different model number pass as the same product", () => {
    expect(fuzzyScore("xiaomi band 9", "Xiaomi Smart Band 8")).toBeLessThan(FUZZY_MIN);
    expect(fuzzyScore("iphone 15", "Apple iPhone 14 Pro")).toBeLessThan(FUZZY_MIN);
    expect(fuzzyScore("iphone 15", "Apple iPhone 15 Pro")).toBeGreaterThan(fuzzyScore("iphone 15", "Apple iPhone 14 Pro"));
  });
  it("rejects unrelated titles", () => {
    expect(matches("xiaomi band", "Stanley Quencher Tumbler 40oz")).toBe(false);
    expect(matches("cable", "Sony 无线降噪耳机")).toBe(false);
    expect(matches("維他奶", "可口可樂 330ml")).toBe(false);
  });
  it("does not accept typos on short words or numbers", () => {
    expect(matches("tv 55", "Sony TV 65 inch")).toBe(false);
    expect(fuzzyScore("ipad", "iPod touch")).toBeLessThan(FUZZY_MIN);
  });
});

describe("rankFuzzy", () => {
  const rows = [
    { id: 1, title: "Xiaomi Smart Band 8" },
    { id: 2, title: "Xiaomi Smart Band 9 Black" },
    { id: 3, title: "Stanley Tumbler" },
    { id: 4, title: "小米手环9 NFC版" },
  ];
  it("ranks exact matches first and drops non-matches", () => {
    const r = rankFuzzy("xiaomi band 9", rows, (x) => x.title);
    expect(r[0].row.id).toBe(2);
    expect(r[0].exact).toBe(true);
    expect(r.map((x) => x.row.id)).toContain(4);
    expect(r.map((x) => x.row.id)).not.toContain(3);
    expect(r.map((x) => x.row.id)).not.toContain(1);
  });
});

describe("editDistance", () => {
  it("counts transpositions as one edit", () => {
    expect(editDistance("smasung", "samsung")).toBe(1);
    expect(editDistance("xiaomy", "xiaomi")).toBe(1);
    expect(editDistance("abc", "xyz", 1)).toBeGreaterThan(1);
  });
});

describe("didYouMean", () => {
  const vocab = vocabulary(["Xiaomi Smart Band 9", "Samsung Galaxy S24", "Xiaomi Redmi Note 13"]);
  it("corrects towards words the catalogue knows", () => {
    expect(didYouMean("xiaomy band", vocab)).toBe("xiaomi band");
    expect(didYouMean("samsng galaxy", vocab)).toBe("samsung galaxy");
  });
  it("returns null when nothing needs fixing", () => {
    expect(didYouMean("xiaomi band", vocab)).toBeNull();
    expect(didYouMean("小米", vocab)).toBeNull();
  });
});

describe("querySignature", () => {
  it("is the same for reordered, translated and Traditional wordings", () => {
    const s = querySignature("xiaomi band 9");
    expect(querySignature("band 9 xiaomi")).toBe(s);
    expect(querySignature("Xiaomi Bands 9")).toBe(s);
    expect(querySignature("小米手環9")).toBe(s);
  });
  it("differs when the model number differs", () => {
    expect(querySignature("xiaomi band 8")).not.toBe(querySignature("xiaomi band 9"));
  });
});

describe("candidateNeedles / scriptVariants", () => {
  it("probes both scripts for Chinese", () => {
    expect(scriptVariants("維他奶")).toEqual(expect.arrayContaining(["維他奶", "维他奶"]));
    expect(candidateNeedles("維他奶")).toEqual(expect.arrayContaining(["維他奶", "维他奶"]));
  });
  it("skips bare numbers and keeps a prefix for typos", () => {
    const n = candidateNeedles("xiaomy band 9");
    expect(n).not.toContain("9");
    expect(n).toContain("xiao");
  });
});

describe("half-typed words", () => {
  it("matches a prefix of 4+ letters", () => {
    expect(matches("sams galaxy", "Samsung Galaxy S24")).toBe(true);
    expect(matches("tote bags", "Longchamp Le Pliage tote bag")).toBe(true);
  });
});
