var path = require("path");

var config = {
    entry: "./src/app.tsx",
    devtool: "inline-source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/
            }
        ],
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    }
};

module.exports = config;
