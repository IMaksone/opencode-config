import { Plugin } from '@opencode/plugin';

import { installBrowserGuard } from '../browser-guard/plugin';

export default Plugin.define({
  id: 'kit.browser-guard',
  setup: installBrowserGuard,
});
