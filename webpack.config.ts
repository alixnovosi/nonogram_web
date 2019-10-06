import * as path from "path";
import * as webpack from "webpack";

import TerserPlugin from "terser-webpack-plugin";

const isProduction = process.env.NODE_ENV === "prod";

const config: webpack.Configuration = {
    // documentation: https://webpack.js.org/configuration/dev-server/
    devServer: {
        historyApiFallback: true,
        noInfo: true,
        hot: true,
    },

    devtool: isProduction? "source-map" : "eval-source-map",

    resolve: {
        extensions: ["*", ".js", ".jsx", ".ts", ".tsx", ".sass", ".css"],
    },

    entry: "./src/app.tsx",

    mode: isProduction ? "production": "development",

    // ugly as hell.
    optimization: {
        minimizer: [
            new TerserPlugin({
                include: /\.(js|jsx|tsx|ts)$/,
                sourceMap: true,
                terserOptions: {
                    output: {
                        comments: /^\**!|@preserve|@license|@cc_on/i,
                    },
                },
            }),
        ],
    },

    output: {
        path: path.resolve(__dirname, "./dist"),
        publicPath: "/dist/",
        filename: isProduction ? "[name].[hash].js" : "[name].js",
    },
    performance: {
        hints: "warning",
    },
    plugins: [],

    module: {
        rules: [
            {
                test: /\.(js|jsx|tsx|ts)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            sourceMap: true,
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            browsers: ["> 0.25%", "not dead", "IE >= 8",],
                                        },
                                        corejs: 3,
                                        useBuiltIns: "usage",
                                    },
                                ],
                                "@babel/preset-typescript",
                                "@babel/react",
                            ],
                            plugins: [
                                [
                                    "@babel/plugin-proposal-decorators",
                                    {legacy: true},
                                ],
                                [
                                    "@babel/proposal-class-properties",
                                    {loose: true},
                                ],
                            ],
                        },
                    },
                ],
            },
        ],
    },
};

export default config;
if (isProduction) {
    // http://vue-loader.vuejs.org/en/workflow/production.html
    module.exports.plugins = (module.exports.plugins || []).concat([
        new webpack.LoaderOptionsPlugin({
            minimize: true,
        })
    ]);
}
