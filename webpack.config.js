const webpack = require('webpack');
const path = require('path');
const DashboardPlugin = require('webpack-dashboard/plugin');
const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const CopyWebpackPlugin = require('copy-webpack-plugin');

var config = {
  devtool: isProd ? 'hidden-source-map' : 'cheap-eval-source-map',
  context: path.resolve('./src/'),
  entry: {
    app: './index.ts'
  },
  output: {
    path: path.resolve('./dist'),
    filename: '[name].bundle.[hash].js',
    sourceMapFilename: '[name].map',
    devtoolModuleFilenameTemplate: function (info) {
      return "file:///" + info.absoluteResourcePath;
    }
  },
  module: {
    rules: [
      { enforce: 'pre', test: /\.ts$/, exclude: ["node_modules"], loader: 'ts-loader' }

    ]
  },
  resolve: {
    extensions: [".ts", ".js"],
    modules: [path.resolve('./app'), 'node_modules']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': { // eslint-disable-line quote-props
        NODE_ENV: JSON.stringify(nodeEnv)
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      output: { comments: false },
      sourceMap: false
    }),
    new DashboardPlugin(),
    new webpack.LoaderOptionsPlugin({
      options: {
        tslint: {
          emitErrors: true,
          failOnHint: true
        }
      }
    }),
  ]
};

module.exports = config;