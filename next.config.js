/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js': 'plotly.js/dist/plotly.min.js',
    };
    return config;
  },
}

module.exports = nextConfig
