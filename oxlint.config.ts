import { defineConfig, type OxlintConfig } from 'oxlint';
import yunarchOxlintConfig from './node_modules/@yunarch/config-web/dist/config.oxlint.json' with { type: 'json' };

const config: OxlintConfig = defineConfig({
  ...(yunarchOxlintConfig as never as OxlintConfig),
  ignorePatterns: [
    ...yunarchOxlintConfig.ignorePatterns,
    'src/utils/templates.ts',
  ],
  overrides: [
    {
      files: ['**/*ContextProvider.tsx'],
      rules: {
        'react/only-export-components': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        'require-param-type': 'off',
        'require-returns-type': 'off',
      },
    },
  ],
});

export default config;
