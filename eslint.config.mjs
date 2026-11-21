import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 显式注册插件，便于在下方覆盖规则（eslint-config-next 已依赖该插件）
    plugins: {
      "react-hooks": reactHooks,
    },
    /**
     * 本项目为 Next.js 16 早期代码基，部分组件在 effect 内同步 setState、或在渲染期读取 ref。
     * 这些规则来自新版 React Hooks 插件（React Compiler 相关），对现有交互逻辑会成批报错。
     * 为保持「不改功能、只做开源整理」的原则，这里降级为警告，便于渐进式重构。
     */
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // PM2 配置是 CommonJS，允许 require
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "data/**",
  ]),
]);

export default eslintConfig;
