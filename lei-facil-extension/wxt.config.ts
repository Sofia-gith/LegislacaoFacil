import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    host_permissions: [
      '*://legislacao.prefeitura.sp.gov.br/*',
      'http://localhost:8000/*',
      'http://localhost/*',
    ],
    permissions: [
      'tabs',
      'scripting',
      'storage',
    ],
  },
});
