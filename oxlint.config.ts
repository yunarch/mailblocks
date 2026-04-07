import { defineConfig, type OxlintConfig } from 'oxlint';
import yunarchOxlintConfig from './node_modules/@yunarch/config-web/dist/config.oxlint.json' with { type: 'json' };

export default defineConfig({
  ...(yunarchOxlintConfig as never as OxlintConfig),
});
