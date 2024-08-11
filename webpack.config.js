const path = require('path');

module.exports = {
  mode: 'development',  // 或 'production'
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: 'source-map',  // 添加 source map 支持
  resolve: {
    extensions: ['.js', '.jsx'], // 添加 .jsx 扩展名支持
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,  // 匹配 .js 和 .jsx 文件
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,  // 添加处理 CSS 文件的规则
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: false // 不自动打开浏览器
  },
};
