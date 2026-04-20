import '../scripts/next-federation-env.mjs';
import NextFederationPlugin from '@module-federation/nextjs-mf';

const remoteA =
  process.env.NEXT_PUBLIC_REMOTE_A_URL || 'http://localhost:3001';
const remoteB =
  process.env.NEXT_PUBLIC_REMOTE_B_URL || 'http://localhost:3003';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/character-count',
        destination: '/transactions',
        permanent: false,
      },
      {
        source: '/square-number',
        destination: '/transactions',
        permanent: false,
      },
      { source: '/stock', destination: '/watchlist', permanent: false },
    ];
  },
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          remote_a: `remote_a@${remoteA}/_next/static/chunks/remoteEntry.js`,
          remote_b: `remote_b@${remoteB}/_next/static/chunks/remoteEntry.js`,
        },
        // Host keeps default bundling so SSR/prerender gets a single React instance.
        shared: {},
      })
    );
    return config;
  },
};

export default nextConfig;
