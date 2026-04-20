import '../scripts/next-federation-env.mjs';
import NextFederationPlugin from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'remote_b',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './Watchlist': './components/Watchlist.js',
        },
        shared: {},
      })
    );
    return config;
  },
};

export default nextConfig;
