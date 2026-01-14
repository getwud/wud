const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");

module.exports = defineConfig({
  parallel: false, // Disable parallel build to avoid Thread Loader errors
  devServer: {
    proxy: "http://localhost:3000",
  },

  pwa: {
    name: "WUD",
    themeColor: "#00355E",
    msTileColor: "#00355E",
    mobileWebAppCapable: "yes",
    manifestOptions: {
      short_name: "WUD",
      background_color: "#00355E",
    },
  },

  chainWebpack: config => {
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
