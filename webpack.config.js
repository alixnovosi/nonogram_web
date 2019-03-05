const { CheckerPlugin } = require('awesome-typescript-loader')

var config = {
    devtool: "source-map",
    entry: [
        "./src/app.tsx",
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader",
                exclude: /node_modules/,
            },
            {
                "enforce": "pre",
                "test": /\.js$/,
                "loader": "source-map-loader",
            }
        ],
    },
    output: {
        filename: "main.js",
        path: __dirname + "/dist",
    },
    plugins: [
        new CheckerPlugin()
    ],
    resolve: {
        extensions: [".tsx", ".ts", ".js", "json"],
    },
    target: "web",
};

module.exports = config;
