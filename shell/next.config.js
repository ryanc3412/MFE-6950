import NextFederationPlugin from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, options) {
    const { isServer } = options;
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          remote_a: `remote_a@http://localhost:3001/_next/static/chunks/remoteEntry.js`,
          remote_b: `remote_b@http://localhost:3003/_next/static/chunks/remoteEntry.js`,
          // Vue remote is loaded manually in hello-world.tsx via import(url) so it runs as ESM (import.meta works).
          // Do not add remote_vue here or the runtime will load it as a classic script and break.
        },
        shared: {},
      })
    );
    return config;
  },
};

export default nextConfig;
