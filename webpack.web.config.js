const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/entry/web.ts",
  mode: "development",
  target: "web",
  module: {
    rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }],
  },
  optimization: { minimize: false },
  resolve: { extensions: [".tsx", ".ts", ".js"] },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist/web"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public/index.html", to: "index.html" }],
    }),
  ],
};
