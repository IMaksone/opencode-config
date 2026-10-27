import { Plugin } from '@opencode/plugin';

import { installDeleteTool } from '../delete-tool/plugin';

export default Plugin.define({
  id: 'cervart.delete-tool',
  setup: installDeleteTool,
});
