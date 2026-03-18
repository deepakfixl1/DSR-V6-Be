/**
 * Safe expression evaluator for scoring logic.
 * Supports numbers, variables, parentheses, + - * /, and functions: min, max, abs, round, floor, ceil.
 * No eval, no Function.
 */

const OPERATORS = {
  "+": { precedence: 1, assoc: "L", fn: (a, b) => a + b },
  "-": { precedence: 1, assoc: "L", fn: (a, b) => a - b },
  "*": { precedence: 2, assoc: "L", fn: (a, b) => a * b },
  "/": { precedence: 2, assoc: "L", fn: (a, b) => a / b },
};

const FUNCTIONS = {
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  abs: (a) => Math.abs(a),
  round: (a) => Math.round(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
};

const isIdentifierStart = (ch) => /[A-Za-z_]/.test(ch);
const isIdentifierChar = (ch) => /[A-Za-z0-9_]/.test(ch);

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "," || ch === "(" || ch === ")") {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }
    if (OPERATORS[ch]) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      const value = Number(num);
      if (Number.isNaN(value)) {
        throw new Error(`Invalid number: ${num}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (isIdentifierStart(ch)) {
      let id = ch;
      i += 1;
      while (i < expr.length && isIdentifierChar(expr[i])) {
        id += expr[i];
        i += 1;
      }
      tokens.push({ type: "id", value: id });
      continue;
    }
    throw new Error(`Unexpected token: ${ch}`);
  }
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const ops = [];
  const funcStack = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "number" || token.type === "id") {
      output.push(token);
      continue;
    }
    if (token.type === ",") {
      while (ops.length && ops[ops.length - 1].type !== "(") {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error("Misplaced comma");
      continue;
    }
    if (token.type === "(") {
      ops.push(token);
      continue;
    }
    if (token.type === ")") {
      while (ops.length && ops[ops.length - 1].type !== "(") {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error("Mismatched parentheses");
      ops.pop();
      if (funcStack.length) {
        const func = funcStack.pop();
        output.push({ type: "func", value: func });
      }
      continue;
    }
    if (token.type === "op") {
      const o1 = token.value;
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== "op") break;
        const o2 = top.value;
        const cond =
          (OPERATORS[o1].assoc === "L" && OPERATORS[o1].precedence <= OPERATORS[o2].precedence) ||
          (OPERATORS[o1].assoc === "R" && OPERATORS[o1].precedence < OPERATORS[o2].precedence);
        if (!cond) break;
        output.push(ops.pop());
      }
      ops.push(token);
      continue;
    }
    if (token.type === "id") {
      output.push(token);
    }
  }
  while (ops.length) {
    const op = ops.pop();
    if (op.type === "(") throw new Error("Mismatched parentheses");
    output.push(op);
  }
  return output;
}

function parse(tokens) {
  const output = [];
  const ops = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "id" && tokens[i + 1]?.type === "(") {
      if (!FUNCTIONS[token.value]) {
        throw new Error(`Unknown function: ${token.value}`);
      }
      ops.push({ type: "func", value: token.value });
      continue;
    }
    if (token.type === "number" || token.type === "id") {
      output.push(token);
      continue;
    }
    if (token.type === "(") {
      ops.push(token);
      continue;
    }
    if (token.type === ")") {
      while (ops.length && ops[ops.length - 1].type !== "(") {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error("Mismatched parentheses");
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === "func") {
        output.push(ops.pop());
      }
      continue;
    }
    if (token.type === ",") {
      while (ops.length && ops[ops.length - 1].type !== "(") {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error("Misplaced comma");
      output.push({ type: "argsep" });
      continue;
    }
    if (token.type === "op") {
      const o1 = token.value;
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== "op") break;
        const o2 = top.value;
        const cond =
          (OPERATORS[o1].assoc === "L" && OPERATORS[o1].precedence <= OPERATORS[o2].precedence) ||
          (OPERATORS[o1].assoc === "R" && OPERATORS[o1].precedence < OPERATORS[o2].precedence);
        if (!cond) break;
        output.push(ops.pop());
      }
      ops.push(token);
      continue;
    }
    throw new Error(`Unexpected token: ${token.type}`);
  }
  while (ops.length) {
    const op = ops.pop();
    if (op.type === "(") throw new Error("Mismatched parentheses");
    output.push(op);
  }
  return output;
}

function evalRpn(rpn, context) {
  const stack = [];
  for (const token of rpn) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }
    if (token.type === "id") {
      const value = context[token.value];
      if (typeof value !== "number") {
        stack.push(0);
      } else {
        stack.push(value);
      }
      continue;
    }
    if (token.type === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (typeof a !== "number" || typeof b !== "number") {
        throw new Error("Invalid operands");
      }
      stack.push(OPERATORS[token.value].fn(a, b));
      continue;
    }
    if (token.type === "func") {
      const fn = FUNCTIONS[token.value];
      const args = [];
      while (stack.length && stack[stack.length - 1] !== "__argsep__") {
        args.unshift(stack.pop());
      }
      if (stack[stack.length - 1] === "__argsep__") {
        stack.pop();
      }
      if (args.length === 0) {
        args.push(stack.pop());
      }
      stack.push(fn(...args));
      continue;
    }
    if (token.type === "argsep") {
      stack.push("__argsep__");
    }
  }
  if (stack.length !== 1 || typeof stack[0] !== "number" || Number.isNaN(stack[0])) {
    throw new Error("Invalid expression result");
  }
  return stack[0];
}

export function evaluateExpression(expression, context = {}) {
  if (!expression || typeof expression !== "string") {
    throw new Error("Expression is required");
  }
  const tokens = tokenize(expression);
  const rpn = parse(tokens);
  return evalRpn(rpn, context);
}
