const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: ['last 2 versions']
                                },
                                modules: false,
                                useBuiltIns: 'usage',
                                corejs: 3
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-transform-runtime'
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|ico|fbx|wav|mp3)$/i,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            inject: true,
            favicon: './public/favicon.ico',
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css'
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'public',
                    to: '',
                    globOptions: {
                        ignore: ['**/index.html']
                    }
                },
                {
                    from: 'src/styles',
                    to: 'styles'
                },
                {
                    from: 'assets',
                    to: 'assets'
                }
            ]
        })
    ],
    resolve: {
        extensions: ['.js'],
        modules: [
            path.resolve(__dirname, 'src'),
            'node_modules'
        ],
        alias: {
            '@services': path.resolve(__dirname, 'src/services'),
            '@game': path.resolve(__dirname, 'src/game')
        }
    },
    devServer: {
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname, 'dist')
        },
        compress: true,
        port: 3000,
        hot: true
    }
};