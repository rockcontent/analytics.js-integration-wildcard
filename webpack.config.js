module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: `${__dirname}/lib`,
    filename: 'index.js',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [{ test: /\.ts?$/, loader: 'ts-loader' }],
  },
};
