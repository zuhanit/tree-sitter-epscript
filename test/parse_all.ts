import { readdirSync, readFileSync } from "fs";
import Parser from "tree-sitter";
import EpScript from "..";


const parser = new Parser();
parser.setLanguage(EpScript);

const epsFiles = readdirSync("test/fixtures");
for (const fileName of epsFiles) {
  const fileBuffer = readFileSync(`test/fixtures/${fileName}`);
  const content = fileBuffer.toString();
  const tree = parser.parse(content);

  console.log(fileName, tree.rootNode.hasError);
}
