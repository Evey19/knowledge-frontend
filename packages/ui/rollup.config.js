const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");
const postcss = require("rollup-plugin-postcss");
const pkg = require("./package.json");

module.exports = {
  input: "src/index.ts",
  output: [
    { file: pkg.main, format: "cjs", sourcemap: true },
    { file: pkg.module, format: "esm", sourcemap: true },
  ],
  external: [...Object.keys(pkg.peerDependencies || {})],
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({ useTsconfigDeclarationDir: true }),
    postcss({
      extensions: [".css", ".scss"],
      extract: true, // 输出 dist/style.css
      modules: false, // 不启用 CSS Modules
      use: [
        [
          "sass",
          {
            includePaths: ["./src/styles", "node_modules"],
          },
        ],
      ],
    }),
  ],
};
