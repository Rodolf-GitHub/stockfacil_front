import { defineConfig } from 'orval'

export default defineConfig({
  auth: {
    input: './src/openapi/auth.json',
    output: {
      target: './src/apps/auth/api/index.ts',
      schemas: './src/apps/auth/api/schemas',
      client: 'fetch',
    },
  },
  locales: {
    input: './src/openapi/locales.json',
    output: {
      target: './src/apps/locales/api/index.ts',
      schemas: './src/apps/locales/api/schemas',
      client: 'fetch',
    },
  },
  productos: {
    input: './src/openapi/productos.json',
    output: {
      target: './src/apps/productos/api/index.ts',
      schemas: './src/apps/productos/api/schemas',
      client: 'fetch',
    },
  },
  usuarios: {
    input: './src/openapi/usuarios.json',
    output: {
      target: './src/apps/usuarios/api/index.ts',
      schemas: './src/apps/usuarios/api/schemas',
      client: 'fetch',
    },
  },
  plantillasStock: {
    input: './src/openapi/plantillas-stock.json',
    output: {
      target: './src/apps/plantillas_stock/api/index.ts',
      schemas: './src/apps/plantillas_stock/api/schemas',
      client: 'fetch',
    },
  },
  conteosStock: {
    input: './src/openapi/conteos-stock.json',
    output: {
      target: './src/apps/conteos_stock/api/index.ts',
      schemas: './src/apps/conteos_stock/api/schemas',
      client: 'fetch',
    },
  },
})
