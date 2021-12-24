const middlewareMarker = Symbol('middlewareMarker');
// utils
export type MaybePromise<T> = T | Promise<T>;
export type ProcedureType = 'query';
export type ThenArg<T> = T extends PromiseLike<infer U> ? ThenArg<U> : T;
export type inferAsyncReturnType<TFunction extends (...args: any) => any> =
  ThenArg<ReturnType<TFunction>>;

export type identity<T> = T;
/**
 * @internal
 */
export type flatten<T, Q> = identity<{
  [k in keyof T | keyof Q]: k extends keyof T
    ? T[k]
    : k extends keyof Q
    ? Q[k]
    : never;
}>;

// ..impl
interface MiddlewareResultBase<TParams> {
  /**
   * All middlewares should pass through their `next()`'s output.
   * Requiring this marker makes sure that can't be forgotten at compile-time.
   */
  readonly marker: typeof middlewareMarker;
  TParams: TParams;
}

interface MiddlewareOKResult<TParams> extends MiddlewareResultBase<TParams> {
  ok: true;
  data: unknown;
  // this could be extended with `input`/`rawInput` later
}
interface MiddlewareErrorResult<TParams> extends MiddlewareResultBase<TParams> {
  ok: false;
  error: unknown;
  // we could guarantee it's always of this type
}

type MiddlewareResult<TParams> =
  | MiddlewareOKResult<TParams>
  | MiddlewareErrorResult<TParams>;

interface ResultSuccess {
  data: unknown;
}
interface ResultError {
  error: unknown;
}

type Result = ResultSuccess | ResultError;

// type AnyObject = Record<string, unknown>;

type MiddlewareFunction<TInputParams, TNextParams> = (
  params: TInputParams & {
    next: {
      (): Promise<MiddlewareResult<TInputParams>>;
      <T>(params: T): Promise<MiddlewareResult<T>>;
    };
  },
) => Promise<MiddlewareResult<TNextParams>>;

type Resolver<TParams, TResult extends Result> = (
  params: TParams,
) => MaybePromise<TResult>;
// type TResolverTuple = [...[MiddlewareFunction<any, any>], TResolver];

interface Params<TContext> {
  ctx: TContext;
}

// P = PARAMS
// S = SUCCESS
// E = ERROR
function createMiddlewares<TContext>() {
  type TBaseParams = Params<TContext>;
  function middlewares<R1 extends Result, P1 = TBaseParams>(
    resolver: Resolver<P1, R1>,
  ): (params: TBaseParams) => MaybePromise<R1>;
  function middlewares<
    R1 extends Result,
    R2 extends Result,
    P1 = TBaseParams,
    P2 = P1,
  >(
    middleware1: MiddlewareFunction<P1, P2>,
    resolver: Resolver<P2, R2>,
  ): (params: P1) => MaybePromise<R2>;
  function middlewares(...args: any): any {
    throw new Error('Unimplemented');
  }

  return middlewares;
}

type TestContext = {
  user?: {
    id: string;
  };
};

// only resolver
const mws = createMiddlewares<{
  user?: {
    id: string;
  };
}>();
{
  const data = mws(() => {
    return {
      data: 'ok',
    };
  });
}
{
  // with a reusable middleware
  const mw = mws(
    ({ next, ...params }) => {
      if (!params.ctx.user) {
        throw new Error('asd');
      }
      return next({
        ...params,
        ctx: {
          ...params.ctx,
          user: params.ctx.user,
        },
      });
    },
    ({ ctx }) => {
      if (Math.random() > 0.5) {
        return {
          error: {
            code: 'some code',
          },
        };
      }
      return {
        data: {
          greeting: 'hello ' + ctx.user.id,
        },
      };
    },
  );

  const result = mw({ ctx: {} });
}
