// Centralised CRACO configuration with hardened defaults for development tooling.
const path = require('path');

const DISABLE_HOT_RELOAD = process.env.DISABLE_HOT_RELOAD === 'true';
const DEV_ALLOWED_HOSTS = ['127.0.0.1', 'localhost'];

const parseDevHosts = (value) => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
    .map((host) => {
      if (host === '*' || host.includes('://')) {
        throw new Error(
          'DEV_ALLOWED_HOSTS must list plain hostnames or IPs. Wildcards and schemes are rejected.',
        );
      }
      return host;
    });
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        webpackConfig.devtool = false;
      }

      if (DISABLE_HOT_RELOAD) {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          (plugin) => plugin.constructor.name !== 'HotModuleReplacementPlugin',
        );
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/,
        };
      } else {
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      return webpackConfig;
    },
  },
  devServer: (devServerConfig) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('The webpack dev server is only available in development mode.');
    }

    const extraHosts = parseDevHosts(process.env.DEV_ALLOWED_HOSTS || '');
    const bindHost = process.env.DEV_SERVER_BIND || '127.0.0.1';
    const publicHost = process.env.DEV_PUBLIC_HOST?.trim();

    const allowedHosts = new Set([...DEV_ALLOWED_HOSTS, ...extraHosts]);
    if (publicHost) {
      allowedHosts.add(publicHost);
    }

    devServerConfig.host = bindHost;
    devServerConfig.allowedHosts = Array.from(allowedHosts);
    devServerConfig.historyApiFallback = {
      disableDotRule: false,
    };
    devServerConfig.client = {
      ...devServerConfig.client,
      webSocketURL: {
        ...devServerConfig.client?.webSocketURL,
        hostname: publicHost || bindHost,
      },
    };

    return devServerConfig;
  },
};
