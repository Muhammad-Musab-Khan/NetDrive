module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const sourceMapRule = webpackConfig.module.rules.find(
        (rule) => rule.enforce === 'pre' && rule.use && rule.use.some((u) => u.loader && u.loader.includes('source-map-loader'))
      );
      if (sourceMapRule) {
        sourceMapRule.exclude = [/node_modules\/jspdf/, /node_modules\/@stripe/];
      }
      return webpackConfig;
    },
  },
};
