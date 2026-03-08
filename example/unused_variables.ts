import Parser from "tree-sitter";
import EpScript from "..";
import chalk from "chalk";
import Table from "cli-table3";
import { readFileSync } from "fs";

const parser = new Parser();
parser.setLanguage(EpScript);

const filePath = process.argv[2] || "test/fixtures/test_eps_object.eps";
const code = readFileSync(filePath, "utf-8");
const tree = parser.parse(code);
const root = tree.rootNode;

interface Declaration {
  name: string;
  line: number;
  kind: string;
}

// Collect all variable/const declarations
const declarations: Declaration[] = [];

const varTypes = ["var_declaration", "var_assign_declaration", "static_var_declaration"];
for (const node of root.descendantsOfType(varTypes)) {
  const kind = node.type === "static_var_declaration" ? "static var" : "var";
  const nameList = node.descendantsOfType("typed_name");
  for (const tn of nameList) {
    const nameNode = tn.childForFieldName("name");
    if (nameNode) {
      declarations.push({
        name: nameNode.text,
        line: nameNode.startPosition.row + 1,
        kind,
      });
    }
  }
}

for (const node of root.descendantsOfType("const_declaration")) {
  const names = node.descendantsOfType("identifier").filter(
    (id) => id.parent?.type === "names"
  );
  for (const nameNode of names) {
    declarations.push({
      name: nameNode.text,
      line: nameNode.startPosition.row + 1,
      kind: "const",
    });
  }
}

// Collect function parameter names
for (const node of root.descendantsOfType(["function_declaration", "object_method_declaration"])) {
  const params = node.childForFieldName("parameters");
  if (!params) continue;
  const nameList = params.descendantsOfType("typed_name");
  for (const tn of nameList) {
    const nameNode = tn.childForFieldName("name");
    if (nameNode) {
      declarations.push({
        name: nameNode.text,
        line: nameNode.startPosition.row + 1,
        kind: "param",
      });
    }
  }
}

// Check if an identifier is a declaration name (not a reference)
const declarationTypes = new Set([
  "typed_name", "names", "function_declaration",
  "object_method_declaration", "object_declaration",
  "function_forward_declaration", "object_forward_declaration",
]);

function isDeclarationName(node: Parser.SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === "typed_name" && parent.childForFieldName("name") === node) return true;
  if (parent.type === "names") return true;
  if (declarationTypes.has(parent.type) && parent.childForFieldName("name") === node) return true;
  return false;
}

// Collect all referenced identifiers
const referenced = new Set<string>();
for (const id of root.descendantsOfType("identifier")) {
  if (!isDeclarationName(id)) {
    referenced.add(id.text);
  }
}

// Find unused
const unused = declarations.filter((d) => !referenced.has(d.name));

// Output
console.log(chalk.bold.blue(`\n  ${filePath}\n`));

if (unused.length === 0) {
  console.log(chalk.green("  No unused variables found.\n"));
} else {
  const table = new Table({
    head: [chalk.bold("Line"), chalk.bold("Name"), chalk.bold("Kind")],
    colAligns: ["right", "left", "left"],
  });
  for (const u of unused.sort((a, b) => a.line - b.line)) {
    table.push([
      chalk.gray(String(u.line)),
      chalk.yellow(u.name),
      chalk.dim(u.kind),
    ]);
  }
  console.log(chalk.bold(` ${unused.length} unused variable(s)\n`));
  console.log(table.toString());
}
