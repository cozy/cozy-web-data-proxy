import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginEjs } from "rsbuild-plugin-ejs";
import { rspack } from "@rspack/core";

export default defineConfig({
  plugins: [pluginEjs(), pluginReact()],
  output: {
    cleanDistPath: true,
    distPath: {
      root: 'build'
    }
  },
  html: {
    template: './src/targets/browser/index.ejs',
    title: 'Cozy DataProxy'
  },
  source: {
    entry: {
      index: './src/targets/browser/index.tsx'
    }
  },
  tools: {
    rspack: {
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
            }
          ],
        })
      ]
    }
  }
});
