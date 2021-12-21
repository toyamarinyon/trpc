import {
  createProcedure,
  createRouter,
  createRouterWithContext,
} from './lib/trpc';

type Context = {
  user?: {
    id: string;
  };
};
const procedure = createProcedure<Context>();

const postRouter = createRouter({
  queries: {
    byId: () => ({ title: 'hello world' }),
  },
});

const hello = procedure(
  ({ ctx }) => `hello ${ctx.user.id ?? 'world'}` as const,
);

const proceduresByType = createRouterWithContext<Context>()({
  queries: {
    hello,
    test: procedure(() => 123),
    foo: ({ ctx }) => 'bar',
  },
});
