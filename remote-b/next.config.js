import NextFederationPlugin from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    const { isServer } = options;
    config.plugins.push(
      new NextFederationPlugin({
        name: 'remote_b',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './CsvUpload': './components/CsvUpload.js',
          './StockPrice': './components/StockPrice.js',
          './LedgerPieCharts': './components/LedgerPieCharts.js',
        },
        shared: {},
      })
    );
    return config;
  },
};

export default nextConfig;
