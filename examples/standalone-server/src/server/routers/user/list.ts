import * as trpc from '@trpc/server';
import { query } from '../../utils/helpers';

export const list = query('list', {
  resolve() {
    return 'test';
  },
});
