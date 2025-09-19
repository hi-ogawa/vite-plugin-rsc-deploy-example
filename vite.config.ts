import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// import inspect from "vite-plugin-inspect";
// import nitro from "@hiogawa/vite-plugin-nitro"
import { nitro } from "nitro/vite";
import path from "node:path";

export default defineConfig((env) => ({
  plugins: [
    rsc({
      // `entries` option is only a shorthand for specifying each `rollupOptions.input` below
      // > entries: { rsc, ssr, client },
      //
      // by default, the plugin setup request handler based on `default export` of `rsc` environment `rollupOptions.input.index`.
      // This can be disabled when setting up own server handler e.g. `@cloudflare/vite-plugin`.
      // > serverHandler: false

      // nitro plugin sets up handler
      // serverHandler: {
      //   environmentName: 'ssr',
      //   entryName: 'index',
      // },
    }),

    // use any of react plugins https://github.com/vitejs/vite-plugin-react
    // to enable client component HMR
    react(),

    // use https://github.com/antfu-collective/vite-plugin-inspect
    // to understand internal transforms required for RSC.
    // inspect(),

    env.command === 'build' && nitro({
      // server: {
      //   environmentName: 'rsc'
      // },
      // config: {
      //   // Nitro automatically chooses a preset based on deployed environment,
      //   // but it can be explicitly specified if needed. e.g.
      //   // preset: 'vercel',
      // },
      // TODO: support non-`ssr` environment as handler entry
      services: {
        ssr: {
          entry: "./src/framework/entry.ssr.tsx",
        },
        // rsc: {
        //   entry: "./src/framework/entry.rsc.tsx",
        // },
      }
    }),

    {
      // fix broken resolution around virtualBundlePlugin and prodEntry
      name: 'fix-nitro-resolve',
      resolveId: {
        order: 'pre',
        handler(source, importer, _options) {
          if (this.environment.name !== 'nitro') return

          if (importer === '#nitro-vite-entry') {
            if (source === 'entry.ssr.js') {
              return path.resolve(".nitro/vite/services/ssr/entry.ssr.js")
            }
          }
          if (importer?.includes('.nitro/vite/services/rsc/index.js')) {
            if (source === '../ssr/index.js') {
              return path.resolve(".nitro/vite/services/ssr/entry.ssr.js")
            }
          }
        },
      }
    }
  ],

  // specify entry point for each environment.
  // (currently the plugin assumes `rollupOptions.input.index` for some features.)
  environments: {
    // `rsc` environment loads modules with `react-server` condition.
    // this environment is responsible for:
    // - RSC stream serialization (React VDOM -> RSC stream)
    // - server functions handling
    rsc: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
          },
        },
        outDir: '.nitro/vite/services/rsc/',
      },
    },

    // `ssr` environment loads modules without `react-server` condition.
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional SSR (React VDOM -> HTML string/stream)
    ssr: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.ssr.tsx',
          },
        },
      },
    },

    // client environment is used for hydration and client-side rendering
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional CSR (React VDOM -> Browser DOM tree mount/hydration)
    // - refetch and re-render RSC
    // - calling server functions
    client: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.browser.tsx',
          },
        },
      },
    },
  },
}))
