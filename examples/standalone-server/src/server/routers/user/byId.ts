import * as trpc from '@trpc/server';

export const byId = trpc.router().query('byId', {
  resolve() {
    return 'test';
  },
});
