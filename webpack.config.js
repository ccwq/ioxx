let path = require("path");
let HtmlWebpackPlugin = require("html-webpack-plugin");
let MiniCssExtract = require('mini-css-extract-plugin');

const fs = require('fs')
const glob = require('glob')
const appDirectory = fs.realpathSync(process.cwd())


const SOURCE_DIR_NAME = "src";

const TARGET_DIR_NAME = "dist";


const { CleanWebpackPlugin } = require('clean-webpack-plugin');


// 获取文件公共方法
const getFiles = filesPath => {
    let files = glob.sync(filesPath)
    let obj = {}

    for (let i = 0; i < files.length; i++) {

        let relativePath = files[i]

        // 扩展名 eg: .js
        let extName = path.extname(relativePath)

        // 文件名 eg: index
        let baseName = path.basename(relativePath, extName)


        let entryName = relativePath.replace(SOURCE_DIR_NAME + "/", "").replace(extName, "");

        let filePath = path.resolve(appDirectory, relativePath);

        obj[entryName] = {
            path:filePath,
            filePath,
            relativePath,
            entryName,
            extName,
            baseName,
        }
    }

    return obj
}



module.exports = {
    devServer: {
        port: 3000,
        progress: true,
        contentBase: "./build",
        compress: true
    },
    // mode: "development",
    mode: "production",
    entry: Object.values(getFiles("src/**/*.js")).reduce((ret, el)=>{
        ret[el.entryName] = el.filePath;
        return ret;
    }, {}),
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist")
    },
    plugins: [
        // new HtmlWebpackPlugin({
        //     template: './src/index.html',
        //     filename: 'index.html',
        //     minify: {
        //         removeAttributeQuotes: true,
        //         collapseWhitespace: true
        //     },
        //     hash: true
        // }),
        // new MiniCssExtract({
        //     filename: 'main.css'
        // }),
        new CleanWebpackPlugin(),
    ],
    module: {
        rules: [{
            test: /\.css$/,
            use: [
                MiniCssExtract.loader,
                'css-loader',
                'postcss-loader'
            ]
        },
            {
                test: /\.less$/,
                use: [
                    MiniCssExtract.loader,
                    'css-loader',
                    'less-loader',
                    'postcss-loader'
                ]
            },
            {
                // 匹配js文件，然后用下面所配置的工具对这些文件进行编译处理
                test: /\.js$/,
                use: {
                    // babel的核心模块
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            // 配置babel的预设，将ES语法转成ES5语法
                            '@babel/preset-env'
                        ],
                        plugins: [
                            // 配置babel插件，转换更更高版本语法
                            '@babel/plugin-proposal-class-properties'
                        ]
                    }
                }
            }
        ]
    }
}
