import svelteConfig from "./svelte.config.js";
import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: [
      "build/**",
      ".svelte-kit/**",
      "node_modules/**",
      "dist/**",
      "**/*.d.ts",
      "vite.config.ts",
    ],
  },

  // Base JS/TS/Svelte configs
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,

  // Global language options
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Svelte + TypeScript parser config
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
    },
  },

  // Svelte-specific overrides — Svelte 5 uses `let` for props/runes
  {
    files: ["**/*.svelte"],
    rules: {
      "prefer-const": "off", // Svelte 5 runes ($props, $state, $derived) require `let`
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

      // ── Svelte-specific ──
      "svelte/no-at-debug-tags": "warn",
      "svelte/require-store-reactive-access": "warn",
      "svelte/no-target-blank": "error",

      // ── SvelteKit navigation patterns (performance) ──
      "svelte/no-navigation-without-resolve": "warn",

      // ── General code quality ──
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-var": "error",
    },
  },
];
