import * as trpc from '@trpc/server';
import { byId } from './byId';
import { list } from './list';

export const userRouter = trpc.router().merge(byId).merge(list);
