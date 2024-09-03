import inject from "@rollup/plugin-inject";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import sourcemaps from "rollup-plugin-sourcemaps"
import commonjs from "@rollup/plugin-commonjs"
import babel from "@rollup/plugin-babel"

export default {
  // input: sourceFileWithPath,
  onwarn: function(warning, handler) {
      if(warning.code === "THIS_IS_UNDEFINED"
          || warning.code === "CIRCULAR_DEPENDENCY"
          || warning.code == "SOURCEMAP_ERROR"
      ) return;
      handler(warning);
  },
  plugins: [
    inject({
      TextEncoder: ["text-encoder", "TextEncoder"]
    }),
    nodeResolve({
      extensions: [".js", ".ts"]
    }),
    sourcemaps(),
    commonjs(),
    babel({
      babelHelpers: "bundled",
      extensions: [".ts", ".js", ".jsx", ".es6", ".es", ".mjs"],
      presets: ["@babel/preset-typescript"],
      plugins: [
        "near-sdk-js/lib/cli/build-tools/include-bytes.js",
        [
          "near-sdk-js/lib/cli/build-tools/near-bindgen-exporter.js",
          { verbose: false },
        ],
        ["@babel/plugin-proposal-decorators", { version: "legacy" }],
      ]
    })
  ]
}
