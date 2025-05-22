import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// 根据环境变量确定规则严格程度
const isProduction = process.env.NODE_ENV === 'production';

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/prefer-as-const": "off",
      // 开发环境严格，生产环境宽松
      "react-hooks/rules-of-hooks": isProduction ? "warn" : "error",
      "react/display-name": isProduction ? "off" : "error",
      // hooks 依赖检查在开发时也要严格
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

export default eslintConfig;
