import NextFederationPlugin from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    const { isServer } = options;
    config.plugins.push(
      new NextFederationPlugin({
        name: 'remote_a',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './CsvTable': './components/CsvTable.js',
        },
        shared: {},
      })
    );
    return config;
  },
};

export default nextConfig;
