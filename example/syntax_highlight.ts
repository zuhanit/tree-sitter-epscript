import Parser from "tree-sitter";
import EpScript from "..";
import chalk, { type ChalkInstance } from "chalk";
import { readFileSync } from "fs";

const parser = new Parser();
parser.setLanguage(EpScript);

const filePath = process.argv[2] || "test/fixtures/test_eps_object.eps";
const code = readFileSync(filePath, "utf-8");
const tree = parser.parse(code);

// Map node types to chalk styles
const styles: Record<string, ChalkInstance> = {
  // Keywords
  "function": chalk.magenta.bold,
  "var": chalk.magenta.bold,
  "const": chalk.magenta.bold,
  "static": chalk.magenta.bold,
  "if": chalk.magenta.bold,
  "else": chalk.magenta.bold,
  "while": chalk.magenta.bold,
  "for": chalk.magenta.bold,
  "foreach": chalk.magenta.bold,
  "return": chalk.magenta.bold,
  "break": chalk.magenta.bold,
  "continue": chalk.magenta.bold,
  "switch": chalk.magenta.bold,
  "epdswitch": chalk.magenta.bold,
  "switchcase": chalk.magenta.bold,
  "case": chalk.magenta.bold,
  "default": chalk.magenta.bold,
  "import": chalk.magenta.bold,
  "as": chalk.magenta.bold,
  "object": chalk.magenta.bold,
  "extends": chalk.magenta.bold,
  "once": chalk.magenta.bold,

  // Literals
  "number": chalk.yellow,
  "string": chalk.green,
  "true": chalk.yellow.bold,
  "false": chalk.yellow.bold,
  "none": chalk.yellow.bold,
  "escape_sequence": chalk.cyan,

  // Comments
  "comment": chalk.gray.italic,

  // Identifiers
  "property_identifier": chalk.white,
};

// Special styling based on parent context
function getStyle(node: Parser.SyntaxNode): ChalkInstance | null {
  const type = node.type;

  if (styles[type]) return styles[type];

  if (type === "identifier") {
    const parent = node.parent;
    if (!parent) return chalk.white;
    // Function name in declaration
    if (
      (parent.type === "function_declaration" ||
        parent.type === "object_method_declaration" ||
        parent.type === "function_forward_declaration") &&
      parent.childForFieldName("name") === node
    ) {
      return chalk.blue.bold;
    }
    // Function call
    if (parent.type === "call_expression" && parent.childForFieldName("function") === node) {
      return chalk.blue;
    }
    // Object name
    if (
      (parent.type === "object_declaration" || parent.type === "object_forward_declaration") &&
      parent.childForFieldName("name") === node
    ) {
      return chalk.cyan.bold;
    }
    // Type annotation
    if (parent.type === "typed_name" && parent.childForFieldName("type") === node) {
      return chalk.cyan;
    }
    // Return type
    if (parent.type === "function_return_types") {
      return chalk.cyan;
    }
    return chalk.white;
  }

  return null;
}

// Walk the tree and collect leaf nodes with their positions
interface ColoredSpan {
  startIndex: number;
  endIndex: number;
  style: ChalkInstance;
}

function collectSpans(node: Parser.SyntaxNode, spans: ColoredSpan[]) {
  if (node.childCount === 0) {
    const style = getStyle(node);
    if (style) {
      spans.push({ startIndex: node.startIndex, endIndex: node.endIndex, style });
    }
    return;
  }

  // For string nodes, treat the whole thing as one span
  if (node.type === "string") {
    spans.push({ startIndex: node.startIndex, endIndex: node.endIndex, style: chalk.green });
    return;
  }

  for (const child of node.children) {
    collectSpans(child, spans);
  }
}

const spans: ColoredSpan[] = [];
collectSpans(tree.rootNode, spans);
spans.sort((a, b) => a.startIndex - b.startIndex);

// Build the highlighted output
let result = "";
let pos = 0;

for (const span of spans) {
  if (span.startIndex > pos) {
    result += code.slice(pos, span.startIndex);
  }
  result += span.style(code.slice(span.startIndex, span.endIndex));
  pos = span.endIndex;
}
if (pos < code.length) {
  result += code.slice(pos);
}

// Print with line numbers
const lines = result.split("\n");
const pad = String(lines.length).length;
for (let i = 0; i < lines.length; i++) {
  const lineNum = chalk.gray(String(i + 1).padStart(pad) + " │ ");
  console.log(lineNum + lines[i]);
}
