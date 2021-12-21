import { createProcedure, createRouter } from './lib/trpc';

type Context = {
  user?: {
    id: string;
  };
};
const procedure = createProcedure<Context>();

const routes = createRouter({
  queries: {
    hello: procedure(() => 'world' as const),
    test: procedure(() => 123),
  },
});
