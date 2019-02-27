module.exports = options => {
    return {
        entry: "./src/index.js",
        output: {
            filename: "main.js",
        },
        module: {
            rules: [
                {
                    test: /.js$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                cacheDirectory: true,
                            },
                        },
                    ],
                },
            ],
        },
    };
};
