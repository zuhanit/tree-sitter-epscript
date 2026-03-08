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

function getParams(node: Parser.SyntaxNode): string {
  const params = node.childForFieldName("parameters");
  if (!params) return "()";
  const nameList = params.namedChildren;
  if (nameList.length === 0) return "()";
  const parts = nameList[0].namedChildren.map((typed) => {
    const name = typed.childForFieldName("name")?.text ?? "";
    const type = typed.childForFieldName("type")?.text;
    return type ? `${name}: ${type}` : name;
  });
  return `(${parts.join(", ")})`;
}

function getReturnType(node: Parser.SyntaxNode): string {
  const ret = node.childForFieldName("return_type");
  if (!ret) return "";
  return ret.namedChildren.map((c) => c.text).join(", ");
}

// Functions
const functions = tree.rootNode.descendantsOfType("function_declaration");
const funcTable = new Table({
  head: [chalk.bold("Function"), chalk.bold("Parameters"), chalk.bold("Return Type")],
});
for (const fn of functions) {
  const name = fn.childForFieldName("name")?.text ?? "";
  funcTable.push([chalk.green(name), getParams(fn), chalk.yellow(getReturnType(fn))]);
}

// Objects
const objects = tree.rootNode.descendantsOfType("object_declaration");

console.log(chalk.bold.blue(`\n  ${filePath}\n`));
console.log(chalk.bold(" Functions"));
console.log(funcTable.toString());

for (const obj of objects) {
  const objName = obj.childForFieldName("name")?.text ?? "";
  const superclass = obj.childForFieldName("superclass")?.text;
  const header = superclass
    ? `${objName} extends ${superclass}`
    : objName;

  const objTable = new Table({
    head: [chalk.bold("Type"), chalk.bold("Name"), chalk.bold("Details")],
  });

  const fields = obj.descendantsOfType("object_field_declaration");
  for (const f of fields) {
    const declarators = f.childForFieldName("declarators");
    if (!declarators) continue;
    for (const typed of declarators.namedChildren) {
      const name = typed.childForFieldName("name")?.text ?? "";
      const type = typed.childForFieldName("type")?.text;
      objTable.push([chalk.magenta("field"), chalk.green(name), type ? chalk.yellow(type) : ""]);
    }
  }

  const methods = obj.descendantsOfType("object_method_declaration");
  for (const m of methods) {
    const name = m.childForFieldName("name")?.text ?? "";
    const ret = getReturnType(m);
    const detail = getParams(m) + (ret ? ` → ${ret}` : "");
    objTable.push([chalk.blue("method"), chalk.green(name), detail]);
  }

  console.log(chalk.bold(`\n Object: ${chalk.cyan(header)}`));
  console.log(objTable.toString());
}
