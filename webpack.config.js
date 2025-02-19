import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

import webpack from "webpack";
import { UserscriptPlugin as WebpackUserscript } from "webpack-userscript";
import simpleGit from "simple-git";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const git = simpleGit();

const dev = process.env.NODE_ENV === "development";
console.log(`development: ${dev}`);

git.raw("rev-list", "--count", "HEAD").then((REVISION) => {
  console.log(`commit count: ${REVISION.trim()}`);
  fs.writeFileSync("REVISION", REVISION);
});

export default {
  mode: dev ? "development" : "production",
  optimization: {
    moduleIds: "natural",
    usedExports: true,
  },
  performance: {
    hints: "error",
    maxEntrypointSize: 2000 * 10 ** 3,
    maxAssetSize: 2000 * 10 ** 3,
  },
  entry: path.resolve(__dirname, "src", "index.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.html$|\.html.j2$/i,
        loader: "html-loader",
        options: {
          sources: false,
          minimize: { removeComments: false },
        },
      },
      {
        test: /\.css$/i,
        use: ["css-loader"],
      },
      {
        test: /\.less$/i,
        use: ["css-loader", "less-loader"],
      },
    ],
  },
  externals: {
    "crypto-js": "CryptoJS",
    fflate: "fflate",
    nunjucks: "nunjucks",
    vue: "Vue",
  },
  devServer: {
    server: "http",
    port: 11944,
    allowedHosts: "all",
    hot: true,
    liveReload: true,
    magicHtml: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
    },
    client: {
      webSocketURL: "ws://webpack.localhost:11944/ws",
    },
  },
  plugins: [
    new WebpackUserscript({
      headers: () => {
        const headerPath = path.resolve(__dirname, "src", "header.json");
        const packageJsonPath = path.resolve(__dirname, "package.json");
        const header = JSON.parse(fs.readFileSync(headerPath).toString());
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath).toString()
        );

        const revision = fs.readFileSync("REVISION").toString().trim();
        let version = packageJson.version;
        if (dev) {
          version = version.replace(/\.0$/, "." + Date.now());
        } else {
          version = version.replace(/\.0$/, "." + revision);
        }
        console.log(`version: ${version}`);
        header["version"] = version;
        return header;
      },
      strict: false,
      ssri: !dev,
      pretty: true,
      downloadBaseURL:
        "https://github.com/yingziwu/novel-downloader/raw/gh-pages/",
      updateBaseURL:
        "https://github.com/yingziwu/novel-downloader/raw/gh-pages/",
      proxyScript: {
        filename: "[basename].proxy.user.js",
        baseURL: "http://webpack.localhost:11944/",
      },
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
};
