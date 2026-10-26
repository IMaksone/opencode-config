import { Plugin } from '@opencode/plugin';

import { installGuard } from '../scripts/agent-kit/guard';

export default Plugin.define({
  id: 'cervart.agent-config-guard',
  setup: installGuard,
});
