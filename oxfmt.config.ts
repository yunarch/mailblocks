import { defineConfig, type OxfmtConfig } from 'oxfmt';
import yunarchOxfmtConfig from './node_modules/@yunarch/config-web/dist/config.oxfmt.json' with { type: 'json' };

export default defineConfig({
  ...(yunarchOxfmtConfig as OxfmtConfig),
  ignorePatterns: [
    ...yunarchOxfmtConfig.ignorePatterns,
    'src/utils/templates.ts',
  ],
  sortTailwindcss: true,
});
