import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: ["dist/**", "node_modules/**", "**/*.d.ts"],
  },

  // Base JS/TS configs
  js.configs.recommended,
  ...ts.configs.recommended,

  // Global language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript-specific rules
  {
    files: ["**/*.ts"],
    rules: {
      "prefer-const": "error",
    },
  },

  // Project-specific rules
  {
    rules: {
      // ── Warn on `any` usage — frequent source of hidden type bugs ──
      "@typescript-eslint/no-explicit-any": "warn",

      // ── Catch unused variables ──
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // ── General code quality ──
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-var": "error",
    },
  },
];
