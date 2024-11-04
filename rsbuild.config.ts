import { defineConfig } from '@rsbuild/core';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginEjs } from "rsbuild-plugin-ejs";
import { rspack } from "@rspack/core";

export default defineConfig({
  plugins: [pluginEjs(), pluginNodePolyfill(), pluginReact()],
  output: {
    cleanDistPath: true,
    distPath: {
      root: 'build',
    },
  },
  html: {
    template: './src/targets/browser/index.ejs',
    title: 'Cozy DataProxy'
  },
  performance: {
    chunkSplit: {
      forceSplitting: {
        cozy: /node_modules[\\/]cozy*/,
      },
    }
  },
  source: {
    entry: {
      index: './src/targets/browser/index.tsx'
    }
  },
  tools: {
    rspack: {
      module: {
        rules: [
          { test: /\.webapp$/i, type: "json" }
        ]
      },
      plugins: [
        new rspack.CopyRspackPlugin({
          patterns: [
            {
              from: 'manifest.webapp',
            },
            {
              from: 'README.md'
            },
            {
              from: 'LICENSE'
            },
            {
              from: 'icon.svg'
            },
            {
              from: 'src/targets/public/index.html',
              to: 'reset/index.html'
            },
            {
              from: 'src/targets/public/reset.js',
              to: 'reset/reset.js'
            },
          ],
        })
      ]
    }
  }
});
