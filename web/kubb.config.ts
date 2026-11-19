import { defineConfig } from 'kubb/config'
import { pluginFetch } from '@kubb/plugin-fetch'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginVueQuery } from '@kubb/plugin-vue-query'

export default defineConfig({
  input: process.env.API_OPENAPI_URL ?? 'http://localhost:3000/api/v1/doc',
  output: {
    path: './src/api/generated',
  },
  plugins: [
    pluginTs(),
    pluginFetch({
      baseURL: '/api/v1',
    }),
    pluginVueQuery({
      client: 'fetch',
      hooks: true,
    }),
  ],
})
