const path = require('path')

module.exports = {
    entry: './simulator/js/simulator.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'simulator', 'lib'),
    },

    optimization: {
        minimize: false
    },

    // devtool: 'inline-source-map',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
}
