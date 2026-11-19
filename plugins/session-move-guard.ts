import { Plugin } from '@opencode/plugin';

import { installSessionMoveGuard } from '../session-move-guard/plugin';

export default Plugin.define({
  id: 'kit.session-move-guard',
  setup: installSessionMoveGuard,
});
