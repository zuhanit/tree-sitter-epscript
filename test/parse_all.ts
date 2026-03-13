import { readdirSync, readFileSync } from "fs";
import Parser from "tree-sitter";
import EpScript from "..";

const parser = new Parser();
parser.setLanguage(EpScript);

let hasError = false;
const epsFiles = readdirSync("test/fixtures").filter((f) => f.endsWith(".eps"));

for (const fileName of epsFiles) {
  const content = readFileSync(`test/fixtures/${fileName}`, "utf-8");
  const tree = parser.parse(content);

  if (tree.rootNode.hasError) {
    hasError = true;
    const errors = tree.rootNode.descendantsOfType("ERROR");
    console.error(`FAIL ${fileName} (${errors.length} error(s))`);
    for (const e of errors) {
      console.error(`  line ${e.startPosition.row + 1}: ${e.text.slice(0, 50)}`);
    }
  } else {
    console.log(`OK   ${fileName}`);
  }
}

process.exit(hasError ? 1 : 0);
