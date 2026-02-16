import fs from "node:fs";
import path from "node:path";

function extractArrayLiteral(src, startPattern) {
  const startIdx = src.indexOf(startPattern);
  if (startIdx < 0) throw new Error(`Pattern not found: ${startPattern}`);

  const after = src.slice(startIdx + startPattern.length);
  const openIdx = after.indexOf("[");
  if (openIdx < 0) throw new Error(`'[' not found after: ${startPattern}`);

  // Find the first occurrence of a line that is exactly "];" after the '['.
  const afterOpen = after.slice(openIdx);
  const endMatch = afterOpen.match(/^\];\s*$/m);
  if (!endMatch || endMatch.index == null) throw new Error(`Closing '];' not found for: ${startPattern}`);

  // endMatch.index points to the start of the "];" line, which includes the final ']'.
  // Include that closing ']' but not the semicolon.
  const arrayWithCloseBracket = afterOpen.slice(0, endMatch.index + 1);
  return arrayWithCloseBracket.trim(); // starts with '[' and ends with ']'
}

function stripLineComments(s) {
  return s
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function fixText(s) {
  const fixes = new Map([
    ["테��야키버거세트", "테리야키버거세트"],
    ["치즈��", "치즈볼"],
    ["제로���라 R", "제로콜라 R"],
    ["��이드 메뉴", "사이드 메뉴"],
  ]);
  return fixes.get(s) ?? s;
}

function categoryKeyFromLabel(label) {
  switch (label) {
    case "베스트 메뉴":
      return "best";
    case "세트 메뉴":
      return "set";
    case "사이드 메뉴":
      return "side";
    case "치킨":
      return "chicken";
    case "음료":
      return "drink";
    default:
      return "best";
  }
}

const repoRoot = process.cwd();
const sourcePath = path.resolve(repoRoot, "..", "_design_inbox", "src", "app", "App.tsx");
const outPath = path.resolve(repoRoot, "src", "kiosk_page", "v2", "figmaMenuData.ts");

const raw = fs.readFileSync(sourcePath, "utf8");

const categoriesLiteral = extractArrayLiteral(raw, "const categories =");
const menuItemsLiteral = extractArrayLiteral(raw, "const menuItems");

const srcForEval = `
"use strict";
const categories = ${stripLineComments(categoriesLiteral)};
const menuItems = ${stripLineComments(menuItemsLiteral)};
return { categories, menuItems };
`;

const { categories, menuItems } = new Function(srcForEval)();

const figmaCategories = categories.map((c) => ({
  key: categoryKeyFromLabel(fixText(String(c.name))),
  label: fixText(String(c.name)),
}));

const figmaMenuItems = menuItems.map((m) => {
  const categoryLabel = fixText(String(m.category));
  return {
    id: Number(m.id),
    name: fixText(String(m.name)),
    price: Number(m.price),
    image: String(m.image),
    categoryKey: categoryKeyFromLabel(categoryLabel),
    badge: m.badge ? fixText(String(m.badge)) : undefined,
    calories: m.calories != null ? Number(m.calories) : undefined,
  };
});

const output = `export type FigmaCategoryKey = "best" | "set" | "side" | "chicken" | "drink";

export const FIGMA_CATEGORIES: { key: FigmaCategoryKey; label: string }[] = ${JSON.stringify(figmaCategories, null, 2)};

export type FigmaMenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  categoryKey: FigmaCategoryKey;
  badge?: string;
  calories?: number;
};

export const FIGMA_MENU_ITEMS: FigmaMenuItem[] = ${JSON.stringify(figmaMenuItems, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${outPath} (${figmaMenuItems.length} items)`);
