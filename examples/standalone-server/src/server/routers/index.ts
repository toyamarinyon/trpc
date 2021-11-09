import * as trpc from '@trpc/server';
import { userRouter } from './user';

export const appRouter = trpc.router().merge('user.', userRouter);
