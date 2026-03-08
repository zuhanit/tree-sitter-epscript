/**
 * @file epScript grammar for tree-sitter
 * @author Joo Han, Ham <zuhanit3@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
//
//

module.exports = grammar({
  name: "epscript",

  word: $ => $.identifier,

  extras: ($) => [
    $.comment,
    // @ts-ignore
    /[\s\p{Zs}\\FEFF\u2028\u2029\u2060\u200B]/
  ],

  supertypes: $ => [
    $.statement,
    $.declaration,
    $.expression,
    $.primary_expression
  ],

  inline: $ => [
    $._expressions,
  ],

  conflicts: $ => [
    [$.once_statement, $.parenthesized_expression],
    [$.typed_name, $.assignment_expression],
    [$.primary_expression, $.double_subscript_expression],
  ],

  precedences: $ => [
    [
      "double_subscript",
      "call",
      $.update_expression,
      "unary_void",
      "binary_times",
      "binary_plus",
      "binary_shift",
      "bitwise_and",
      "bitwise_xor",
      "bitwise_or",
      "binary_relation",
      "logical_not",
      "logical_and",
      "logical_or",
      "ternary"
    ],
    ["assign", $.primary_expression],
    [$.import_statement, "import"],
    [$.primary_expression, $.statement_block, "object"],
    ["declaration", "literal"],
  ],

  rules: {
    program: ($) => repeat($.statement),

    declaration: $ => choice(
      $.function_declaration,
      $.function_forward_declaration,
      $.object_declaration,
      $.object_forward_declaration,
      $.var_declaration,
      $.var_assign_declaration,
      $.static_var_declaration,
      $.const_declaration,
    ),

    import_statement: $ =>
      seq(
        "import",
        optional($.import_prefix),
        $.dotted_name,
        optional($.aliased_import),
        $._semicolon,
      ),

    import_prefix: _ => repeat1("."),

    aliased_import: $ => seq(
      "as",
      field("alias", $.identifier)
    ),

    dotted_name: $ => prec(1, sep1($.identifier, ".")),

    //
    // Statements
    //

    statement: ($) => choice(
      $.import_statement,

      $.declaration,
      $.statement_block,
      // In original epScript, solely use expression is invalid. You can comment this statement
      // for parse actually in epScript.
      $.expression_statement,

      // Branch Statements
      $.if_statement,
      $.switch_statement,

      // Control Transfer Statements
      $.continue_statement,
      $.break_statement,
      $.return_statement,

      // Loop Statements
      $.while_statement,
      $.for_statement,
      $.foreach_statement,

      // Once Statement
      $.once_statement,

      $.empty_statement
    ),

    expression_statement: $ => seq($._expressions, $._semicolon),

    else_clause: $ => seq("else", $.statement),

    statement_block: $ =>
      prec.right(
        seq("{", repeat($.statement), "}")
      ),

    if_statement: $ => seq(
      prec.right(
        seq(
          "if",
          field("condition", $.parenthesized_expression),
          field("consequence", $.statement),
          optional(field("alternative", $.else_clause)),
        )
      )
    ),

    switch_body: $ => seq(
      seq("{", repeat(choice($.switch_case, $.switch_default)), "}")
    ),

    switch_case: $ =>
      seq(
        "case",
        field("value", $._expressions),
        ":",
        field("body", repeat($.statement))
      ),

    switch_default: $ =>
      seq("default", ":", field("body", repeat($.statement))),

    switch_statement: $ => seq(
      seq(
        field("keyword", choice("switch", "epdswitch", "switchcase")),
        field("value", $.parenthesized_expression),
        field("body", $.switch_body)
      )
    ),

    while_statement: $ =>
      seq(
        "while",
        field("condition", $.parenthesized_expression),
        field("body", $.statement)
      ),

    foreach_statement: $ =>
      seq(
        "foreach",
        "(",
        field("initializer", $.names),
        ":",
        field("generator", $._expressions),
        ")",
        field("body", $.statement)
      ),

    for_statement: $ =>
      seq(
        "for",
        "(",
        field(
          "initializer",
          choice(
            $.var_declaration,
            $.var_assign_declaration,
            $.const_declaration,
            $.empty_statement
          )
        ),
        field("condition", choice($.expression_statement, $.empty_statement)),
        field("increment", optional($._expressions)),
        ")",
        field("body", $.statement)
      ),

    return_statement: $ =>
      seq("return", optional($._expressions), $._semicolon),

    continue_statement: $ =>
      seq(
        seq(
          "continue",
          $._semicolon
        )
      ),

    break_statement: $ =>
      seq(
        "break",
        $._semicolon
      ),

    once_statement: $ => choice(
      seq("once", "(", field("condition", $.expression), ")", field("body", $.statement)),
      seq("once", field("body", $.statement)),
    ),

    empty_statement: _ => ";",


    //
    // Declarations
    //

    function_declaration: $ => seq(
      "function",
      field("name", $.identifier),
      field("parameters", $.function_parameters),
      optional(field("return_type", $.function_return_types)),
      field("body", $.statement_block)
    ),

    function_forward_declaration: $ => seq(
      "function",
      field("name", $.identifier),
      field("parameters", $.function_parameters),
      optional(field("return_type", $.function_return_types)),
      $._semicolon
    ),

    function_parameters: $ => seq("(", optional($.typed_name_list), ")"),

    function_return_types: $ => seq(":", commaSep1($.expression)),

    object_declaration: $ => seq(
      "object",
      field("name", $.identifier),
      optional(seq("extends", field("superclass", $.expression))),
      "{",
      repeat($.object_member),
      "}",
      $._semicolon
    ),

    object_forward_declaration: $ => seq(
      "object",
      field("name", $.identifier),
      optional(seq("extends", field("superclass", $.expression))),
      $._semicolon
    ),

    object_member: $ => choice(
      $.object_field_declaration,
      $.object_method_declaration,
    ),

    object_field_declaration: $ => seq(
      "var", field("declarators", $.typed_name_list), $._semicolon
    ),

    object_method_declaration: $ => seq(
      "function",
      field("name", $.identifier),
      field("parameters", $.function_parameters),
      optional(field("return_type", $.function_return_types)),
      field("body", $.statement_block)
    ),

    // var a, b;  (no initializer)
    var_declaration: $ => seq(
      "var", $.typed_name_list, $._semicolon
    ),

    // var a, b = 1, 2;  (with initializer)
    var_assign_declaration: $ => seq(
      "var", $.typed_name_list, $.initializer, $._semicolon
    ),

    // static var a, b = 1, 2;  (static requires initializer)
    static_var_declaration: $ => seq(
      "static", "var", $.typed_name_list, $.initializer, $._semicolon
    ),

    // const a, b = 1, 2;  (const uses names only, requires initializer)
    const_declaration: $ => seq(
      "const", $.names, $.initializer, $._semicolon
    ),

    typed_name: $ => prec(1, choice(
      field("name", $.identifier),
      seq(field("name", $.identifier), ":", field("type", $.expression))
    )),

    typed_name_list: $ => commaSep1($.typed_name),

    //
    // Expressions
    //

    _expressions: $ => choice($.expression, $.sequence_expression),

    expression: $ => choice(
      $.primary_expression,
      $.assignment_expression,
      $.augmented_assignment_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.update_expression
    ),

    primary_expression: $ => choice(
      $.subscript_expression,
      $.double_subscript_expression,
      $.parenthesized_expression,
      $.member_expression,
      $.identifier,
      $.string,
      $.number,
      $.true,
      $.false,
      $.none,
      $.array,
      $.call_expression,
      $.lambda_expression,
    ),

    array: $ => seq("[", commaSep1(optional($.expression)), "]"),

    parenthesized_expression: $ => seq("(", $._expressions, ")"),

    call_expression: $ =>
      choice(
        prec(
          "call",
          seq(
            field("function", $.expression),
            field("arguments", $.arguments)
          )
        )
      ),

    member_expression: $ =>
      prec(
        "call",
        seq(
          field("object", $.expression),
          ".",
          field(
            "property",
            alias($.identifier, $.property_identifier)
          )
        )
      ),

    subscript_expression: $ =>
      prec.right(
        "call",
        seq(
          field("object", choice($.expression)),
          "[",
          field("index", $._expressions),
          "]"
        )
      ),

    double_subscript_expression: $ =>
      prec(
        "double_subscript",
        seq(
          field("object", $.expression),
          "[", "[",
          field("indices", commaSep1($.number)),
          "]", "]"
        )
      ),

    lambda_expression: $ => seq(
      "function",
      field("parameters", $.function_parameters),
      optional(field("return_type", $.function_return_types)),
      field("body", $.statement_block)
    ),

    // l2v, mapstring, unit, location, stattxttbl, varray, list are parsed as
    // regular call_expressions since making them keywords would prevent their
    // use as identifiers (e.g. `var unit = 0; unit += 1;`).

    assignment_expression: $ =>
      prec.right(
        "assign",
        seq(
          field("left", $.expression),
          "=",
          field("right", $.expression)
        )
      ),

    augmented_assignment_expression: $ =>
      prec.right(
        "assign",
        seq(
          field("left", $.expression),
          field("operator",
            choice(
              "+=",
              "-=",
              "*=",
              "/=",
              "%=",
              "<<=",
              ">>=",
              "&=",
              "^=",
              "|="
            )
          ),
          field("right", $.expression)
        )
      ),

    ternary_expression: $ =>
      prec.right(
        "ternary",
        seq(
          field("condition", $.expression),
          "?",
          field("consequence", $.expression),
          ":",
          field("alternative", $.expression)
        )
      ),

    binary_expression: $ =>
      choice(
        ...[
          ["//", "binary_times"],
          ["/", "binary_times"],
          ["%", "binary_times"],
          ["*", "binary_times"],
          ["%", "binary_times"],
          ["+", "binary_plus"],
          ["-", "binary_plus"],
          ["<<", "binary_shift"],
          [">>", "binary_shift"],
          ["&", "bitwise_and"],
          ["^", "bitwise_xor"],
          ["|", "bitwise_or"],
          [">=", "binary_relation"],
          ["<=", "binary_relation"],
          ["<", "binary_relation"],
          [">", "binary_relation"],
          ["==", "binary_relation"],
          ["!=", "binary_relation"],
          ["&&", "logical_and", "right"],
          ["||", "logical_or", "right"],
        ].map(([operator, precedence, associativity]) =>
          (associativity === "right" ? prec.right : prec.left)(
            precedence,
            seq(
              field("left", $.expression),
              field("operator", operator),
              field("right", $.expression)
            )
          )
        )
      ),

    unary_expression: $ => choice(
      prec.right(
        "unary_void",
        seq(
          field(
            "operator",
            choice("+", "-", "~", "!")
          ),
          field("argument", $.expression)
        )
      )
    ),

    update_expression: $ => (
      prec.right(
        choice(
          seq(
            field("argument", $.expression),
            field("operator", choice("++", "--"))
          ),
          seq(
            field("operator", choice("++", "--")),
            field("argument", $.expression),
          )
        )
      )
    ),

    sequence_expression: $ => prec.right(commaSep1($.expression)),

    keyword_argument: $ => prec(1, seq(
      field("name", $.identifier), "=", field("value", $.expression)
    )),

    initializer: $ => seq(
      "=",
      commaSep1(field("value", $.expression))
    ),

    //
    // Primitives
    //

    identifier: _ => {
      const alpha = /[a-zA-Z$_]/;
      const alphaNumeric = /[a-zA-Z0-9$_]/;

      return token(seq(alpha, repeat(alphaNumeric)));
    },

    string: $ => seq(
      choice(
        seq(
          choice('"', 'b"'),
          repeat(
            choice(
              alias($.unescaped_double_string_fragment, $.string_fragment),
              $.escape_sequence
            )
          ),
          '"'
        ),
        seq(
          choice("'", "b'"),
          repeat(
            choice(
                alias($.unescaped_single_string_fragment, $.string_fragment),
                $.escape_sequence
            )
          ),
          "'"
        )
      ),
    ),

    unescaped_double_string_fragment: _ =>
      token.immediate(prec(1, /[^"\\\r\n]+/)),

    unescaped_single_string_fragment: _ =>
      token.immediate(prec(1, /[^'\\\r\n]+/)),

    escape_sequence: _ => token.immediate(prec(1, seq(
      '\\',
      choice(
        /u[a-fA-F\d]{4}/,
        /U[a-fA-F\d]{8}/,
        /x[a-fA-F\d]{2}/,
        /\d{1,3}/,
        /\r?\n/,
        /['"abfrntv\\]/,
        /N\{[^}]+\}/,
      ),
    ))),

    comment: _ => token(choice(
      seq("//", /[^\r\n]*/),
      seq(
        "/*",
        /[^*]*\*+([^/*][^*]*\*+)*/,
        "/"
      )
    )),

    number: _ => {
      const hexLiteral = seq(
        choice("0x", "0X"),
        /[\da-fA-F](_?[\da-fA-F])*/,
      );
      const binaryLiteral = seq(choice("0b", "0B"), /[0-1](_?[0-1]*)/);
      const decimalLiteral = seq(/\d(_?\d)*/);

      return token(
        choice(
          hexLiteral,
          binaryLiteral,
          decimalLiteral
        )
      )
    },

    true: _ => choice("true", "True"),
    false: _ => choice("false", "False"),
    none: _ => "None",

    _semicolon: _ => ";",

    names: $ => commaSep1($.identifier),

    //
    // Expression Components
    //

    arguments: $ =>
      seq("(", commaSep(optional(choice($.keyword_argument, $.expression))), ")")
  },
});


/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more occurrences of `rule` separated by `sep`
 *
 * @param {RuleOrLiteral} rule
 *
 * @param {RuleOrLiteral} separator
 *
 * @return {SeqRule}
 *
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
