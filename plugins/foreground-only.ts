import { Plugin } from '@opencode/plugin';

import { installForegroundOnly } from '../foreground/plugin';

export default Plugin.define({
  id: 'cervart.foreground-only',
  setup: installForegroundOnly,
});
