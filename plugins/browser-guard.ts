import { Plugin } from '@opencode/plugin';

import { installBrowserGuard } from '../browser-guard/plugin';

export default Plugin.define({
  id: 'cervart.browser-guard',
  setup: installBrowserGuard,
});
