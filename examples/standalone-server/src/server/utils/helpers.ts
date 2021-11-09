import * as trpc from '@trpc/server';

const router = trpc.router();
export const query = router.query.bind(router);
export const mutation = router.mutation.bind(router);
