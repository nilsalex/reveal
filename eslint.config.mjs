import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
