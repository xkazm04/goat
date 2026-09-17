/**
 * ESLint rule: no-unstable-store-selector
 *
 * Companion to no-whole-store-subscription. That rule flags `useXxxStore()`
 * with NO selector. This one flags the opposite mistake: a selector that DOES
 * narrow the read but returns a freshly constructed value, so the snapshot
 * compares unequal on every store change and the component re-renders anyway.
 *
 *     const { a, b } = useAgentStore((s) => ({ a: s.a, b: s.b }));   // reported
 *     const ids = useAgentStore((s) => s.items.map((i) => i.id));    // reported
 *
 * Fixed by wrapping the selector so the comparison is shallow:
 *
 *     const { a, b } = useAgentStore(useShallow((s) => ({ a: s.a, b: s.b })));
 *
 * Both forms type-check identically: the selector's return type is the same
 * whether or not the value is stable, so nothing in the type system separates
 * the correct program from the broken one, and the broken one is not an error
 * at run time either -- it is a re-render the profiler has to find.
 *
 * Reported only when the constructed value is returned DIRECTLY by the selector
 * passed to the hook, and the call is not already wrapped in a shallow helper.
 */

const HOOK_RE = /^use[A-Z]\w*Store$/;
const SHALLOW_WRAPPERS = new Set(["useShallow", "shallow"]);
/** Methods that always allocate a new array/object from an existing one. */
const ALLOCATING_METHODS = new Set([
  "map",
  "filter",
  "slice",
  "concat",
  "flat",
  "flatMap",
  "sort",
  "reverse",
]);
const ALLOCATING_STATICS = new Set(["keys", "values", "entries", "assign", "fromEntries"]);

/** The expression a concise-or-block arrow/function returns, when there is exactly one. */
function returnedExpression(fn) {
  if (!fn) return null;
  if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return null;
  const body = fn.body;
  if (body.type !== "BlockStatement") return body;
  const returns = body.body.filter((s) => s.type === "ReturnStatement");
  if (returns.length !== 1 || !returns[0].argument) return null;
  return returns[0].argument;
}

/** True when this expression allocates a fresh container every evaluation. */
function isFreshlyConstructed(expr) {
  if (!expr) return null;
  if (expr.type === "ObjectExpression") return "object";
  if (expr.type === "ArrayExpression") return "array";
  if (expr.type === "TSAsExpression" || expr.type === "TSSatisfiesExpression") {
    return isFreshlyConstructed(expr.expression);
  }
  if (expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
    const prop = expr.callee.property;
    if (prop.type === "Identifier" && ALLOCATING_METHODS.has(prop.name)) return "method";
    const obj = expr.callee.object;
    if (
      obj.type === "Identifier" &&
      obj.name === "Object" &&
      prop.type === "Identifier" &&
      ALLOCATING_STATICS.has(prop.name)
    ) {
      return "method";
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a store selector that returns a freshly constructed object or array without a shallow-comparison wrapper -- the snapshot is unequal on every store change",
    },
    messages: {
      unstableSelector:
        "Selector passed to {{name}} returns a newly constructed {{kind}}, so it compares unequal on every store change and the component re-renders regardless of the fields it read. " +
        "Wrap it: {{name}}(useShallow((s) => ...)).",
    },
    schema: [
      {
        type: "object",
        properties: {
          hookPattern: { type: "string" },
          wrappers: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const hookRe = options.hookPattern ? new RegExp(options.hookPattern) : HOOK_RE;
    const wrappers = new Set(options.wrappers ?? SHALLOW_WRAPPERS);

    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !hookRe.test(node.callee.name)) return;
        if (node.arguments.length !== 1) return;

        const arg = node.arguments[0];

        // Already wrapped in a shallow-comparison helper: compliant.
        if (
          arg.type === "CallExpression" &&
          arg.callee.type === "Identifier" &&
          wrappers.has(arg.callee.name)
        ) {
          return;
        }

        const kind = isFreshlyConstructed(returnedExpression(arg));
        if (!kind) return;

        context.report({
          node: arg,
          messageId: "unstableSelector",
          data: { name: node.callee.name, kind: kind === "method" ? "value" : kind },
        });
      },
    };
  },
};
