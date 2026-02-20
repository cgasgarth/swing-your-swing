import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
    { ignores: ["**/dist", "**/node_modules", "**/.vite", "**/uploads", "**/bun.lock", "**/bun.lockb"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            '@stylistic/indent': ['error', 2],
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "error"
        }
    }
);
