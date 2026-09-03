const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");

module.exports = defineConfig({
  publicPath: './',
  parallel: false, // Disable parallel build to avoid Thread Loader errors
  devServer: {
    host: '0.0.0.0',
    proxy: {
      "^/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "^/auth": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
    }
  },

  pwa: {
    name: "WUD",
    themeColor: "#2563eb",
    msTileColor: "#0f172a",
    mobileWebAppCapable: "yes",
    manifestOptions: {
      short_name: "WUD",
      background_color: "#0f172a",
    },
    workboxOptions: {
      // index.html is generated dynamically per-request (basepath injection),
      // so it must never be served from the service worker's precache.
      exclude: [/index\.html$/],
    },
  },

  chainWebpack: config => {
    // Prioritize .vue files
    config.resolve.extensions.prepend('.vue');
    config.plugin('fork-ts-checker').tap(args => {
      args[0].typescript = {
        ...args[0].typescript,
        configFile: 'tsconfig.build.json'
      }
      return args
    })

    config.module
      .rule('ts')
      .use('ts-loader')
      .loader('ts-loader')
      .tap(options => {
        return {
          ...options,
          configFile: 'tsconfig.build.json',
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true
        }
      })
  },

  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: "true",
        __VUE_PROD_DEVTOOLS__: "false",
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      }),
    ],
  },
});
