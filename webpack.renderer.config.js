const webpack = require('webpack');
const rules = require('./webpack.rules');
const { getEnvDefinePluginValues } = require('./webpack.env');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  module: {
    rules,
  },
  plugins: [
    new webpack.DefinePlugin(getEnvDefinePluginValues()),
  ],
};
