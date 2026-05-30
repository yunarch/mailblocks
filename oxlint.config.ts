import { defineConfig, type OxlintConfig } from 'oxlint';
import yunarchOxlintConfig from './node_modules/@yunarch/config-web/dist/config.oxlint.json' with { type: 'json' };

const config: OxlintConfig = defineConfig({
  ...(yunarchOxlintConfig as never as OxlintConfig),
  overrides: [
    {
      files: ['**/*ContextProvider.tsx'],
      rules: {
        'react/only-export-components': 'off',
        'require-param-type': 'off',
        'require-returns-type': 'off',
      },
    },
  ],
});

export default config;
