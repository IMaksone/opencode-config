import { Plugin } from '@opencode/plugin';

import { watch } from '../watchdog/plugin';

export default Plugin.define({
  id: 'kit.subagent-watchdog',
  setup: watch,
});
