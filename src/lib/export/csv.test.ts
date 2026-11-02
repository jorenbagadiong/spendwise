import { describe, expect, it } from "vitest";

import {
  csvFilename,
  escapeCsvField,
  neutralizeFormula,
  toCsv,
  toCsvDocument,
  UTF8_BOM,
  type CsvColumn,
} from "@/lib/export/csv";
import { parseCsv } from "@/lib/export/csv-test-helpers";
import { formatCentavosAsDecimal } from "@/lib/finance/money";

type Item = { name: string; amount: string };
const columns: CsvColumn<Item>[] = [
  { header: "Name", kind: "text", value: (r) => r.name },
  { header: "Amount (PHP)", kind: "number", value: (r) => r.amount },
];

describe("escapeCsvField", () => {
  it("leaves simple values unquoted", () => {
    expect(escapeCsvField("Groceries")).toBe("Groceries");
    expect(escapeCsvField("")).toBe("");
  });

  it("quotes commas, quotes, CR, and LF, doubling embedded quotes", () => {
    expect(escapeCsvField("Rice, eggs")).toBe('"Rice, eggs"');
    expect(escapeCsvField('The "big" one')).toBe('"The ""big"" one"');
    expect(escapeCsvField("line 1\nline 2")).toBe('"line 1\nline 2"');
    expect(escapeCsvField("line 1\r\nline 2")).toBe('"line 1\r\nline 2"');
  });

  it("quotes leading or trailing spaces so they aren't trimmed", () => {
    expect(escapeCsvField(" padded ")).toBe('" padded "');
  });
});

describe("neutralizeFormula", () => {
  it.each([
    ["=1+1"],
    ["+639171234567"],
    ["-50 discount"],
    ["@SUM(A1:A2)"],
    ['=HYPERLINK("http://evil.example","Click")'],
    ["=cmd|' /C calc'!A0"],
    ["\t=1+1"],
    ["\r=1+1"],
    ["   =1+1"],
    ["\n@SUM(1)"],
    [" =1+1"], // non-breaking space
    ["​=1+1"], // zero-width space
    ["\u0000=1+1"], // control character
    ["﻿=1+1"], // stray BOM
    ["＝1+1"], // full-width equals
    ["＋1"], // full-width plus
    ["\tplain text"], // leading tab is itself on OWASP's list
  ])("prefixes %j with a single quote", (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it.each([["Groceries"], ["Bayad sa Meralco"], ["Total = 5"], ["e-wallet top-up"], ["₱500 load"], [""], ["'quoted"]])(
    "leaves %j unchanged",
    (value) => {
      expect(neutralizeFormula(value)).toBe(value);
    },
  );
});

describe("toCsv", () => {
  it("writes just the header for an empty dataset", () => {
    expect(toCsv(columns, [])).toBe("Name,Amount (PHP)\r\n");
  });

  it("uses CRLF line endings with a trailing line break", () => {
    const csv = toCsv(columns, [
      { name: "A", amount: "1.00" },
      { name: "B", amount: "-2.50" },
    ]);
    expect(csv).toBe("Name,Amount (PHP)\r\nA,1.00\r\nB,-2.50\r\n");
  });

  it("round-trips commas, quotes, line breaks, and Unicode through a CSV parser", () => {
    const names = [
      "Rice, eggs, and milk",
      'Jollibee "Chickenjoy" bucket',
      "Line one\nLine two\r\nLine three",
      "Pañuelo para kay Lola – ₱ ñ Ñ é 😀 中文",
      "  leading and trailing  ",
    ];
    const csv = toCsv(columns, names.map((name) => ({ name, amount: "0.00" })));
    expect(parseCsv(csv).slice(1).map((row) => row[0])).toEqual(names);
  });

  it("neutralizes formulas in text cells but keeps negative numbers numeric", () => {
    const csv = toCsv(columns, [{ name: "=2+3", amount: "-12.50" }]);
    expect(parseCsv(csv)[1]).toEqual(["'=2+3", "-12.50"]);
  });

  it("never lets a parsed text cell start a formula, even after skipping whitespace", () => {
    const payloads = ["=1+1", " +1", "\t-1", "\r\n@x", " =x", "＝x", '=HYPERLINK("x")'];
    const parsed = parseCsv(toCsv(columns, payloads.map((name) => ({ name, amount: "0.00" }))));
    for (const [cell] of parsed.slice(1)) {
      const effective = cell.replace(/^[\s\u0000-\u001f\u007f-\u009f​-‍⁠﻿]*/, "");
      expect(effective).toMatch(/^'/);
    }
  });

  it("rejects non-numeric values in number columns", () => {
    expect(() => toCsv(columns, [{ name: "x", amount: "=1+1" }])).toThrow(TypeError);
    expect(() => toCsv(columns, [{ name: "x", amount: "1,000.00" }])).toThrow(TypeError);
    expect(() => toCsv(columns, [{ name: "x", amount: "" }])).not.toThrow();
  });

  it("doesn't mutate the rows", () => {
    const rows = Object.freeze([Object.freeze({ name: "=x", amount: "1.00" })]);
    toCsv(columns, rows);
    expect(rows[0].name).toBe("=x");
  });
});

describe("toCsvDocument", () => {
  it("prefixes the UTF-8 byte order mark", () => {
    const doc = toCsvDocument(columns, []);
    expect(doc.startsWith(UTF8_BOM)).toBe(true);
    expect(new TextEncoder().encode(doc).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  });
});

describe("csvFilename", () => {
  it("builds lowercase, OS-safe names", () => {
    expect(csvFilename("transactions", "2026-11-02")).toBe("spendwise-transactions-2026-11-02.csv");
    expect(csvFilename("Expenses by Category", "2026/11")).toBe("spendwise-expenses-by-category-2026-11.csv");
    expect(csvFilename("a:b*c?", "")).toBe("spendwise-a-b-c.csv");
  });
});

describe("formatCentavosAsDecimal", () => {
  it("formats integer centavos with exactly two decimals and no separators", () => {
    expect(formatCentavosAsDecimal(0)).toBe("0.00");
    expect(formatCentavosAsDecimal(5)).toBe("0.05");
    expect(formatCentavosAsDecimal(125_050)).toBe("1250.50");
    expect(formatCentavosAsDecimal(-5)).toBe("-0.05");
    expect(formatCentavosAsDecimal(-125_000)).toBe("-1250.00");
    expect(formatCentavosAsDecimal(99_999_999_999)).toBe("999999999.99");
  });

  it("avoids floating-point artifacts (0.1 + 0.2)", () => {
    expect(formatCentavosAsDecimal(10 + 20)).toBe("0.30");
    expect(formatCentavosAsDecimal(1_999)).toBe("19.99");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatCentavosAsDecimal(1.5)).toThrow(RangeError);
  });
});
