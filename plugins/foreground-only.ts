import { Plugin } from '@opencode/plugin';

import { installForegroundOnly } from '../foreground/plugin';

export default Plugin.define({
  id: 'kit.foreground-only',
  setup: installForegroundOnly,
});
