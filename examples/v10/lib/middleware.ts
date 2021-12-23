const middlewareMarker = Symbol('middlewareMarker');
type MaybePromise<T> = T | Promise<T>;
type ProcedureType = 'query';
interface MiddlewareResultBase<TParams> {
  /**
   * All middlewares should pass through their `next()`'s output.
   * Requiring this marker makes sure that can't be forgotten at compile-time.
   */
  readonly marker: typeof middlewareMarker;
  TParams: TParams;
}

interface MiddlewareOKResult<TParams, TResultSuccess>
  extends MiddlewareResultBase<TParams> {
  ok: true;
  data: TResultSuccess;
  // this could be extended with `input`/`rawInput` later
}
interface MiddlewareErrorResult<TParams, TResultError>
  extends MiddlewareResultBase<TParams> {
  ok: false;
  error: TResultError;
  // we could guarantee it's always of this type
}

type MiddlewareResult<TParams, TResultSuccess, TResultError> =
  | MiddlewareOKResult<TParams, TResultSuccess>
  | MiddlewareErrorResult<TParams, TResultError>;

interface ResultSuccess {
  data: unknown;
}
interface ResultError {
  error: unknown;
}

type Result = ResultSuccess | ResultError;

// type AnyObject = Record<string, unknown>;

type MiddlewareFunction<
  TInputParams,
  TNextParams,
  TResultSuccess,
  TResultError,
> = (
  params: TInputParams & {
    next: {
      (): Promise<MiddlewareResult<TInputParams, TResultSuccess, TResultError>>;
      <T>(params: T): Promise<
        MiddlewareResult<T, TResultSuccess, TResultError>
      >;
    };
  },
) =>
  | Promise<
      MiddlewareResult<TNextParams, TResultSuccess, TResultError> | TResultError
    >
  | TResultError;

type Resolver<
  TParams,
  TResultSuccess extends ResultSuccess,
  TResultError extends ResultError,
> = (params: TParams) => MaybePromise<TResultSuccess | TResultError>;
// type TResolverTuple = [...[MiddlewareFunction<any, any>], TResolver];

interface Params<TContext> {
  ctx: TContext;
}

// P = PARAMS
// S = SUCCESS
// E = ERROR
function createMiddlewares<TContext>() {
  type TBaseParams = Params<TContext>;
  function middlewares<
    S1 extends ResultSuccess,
    E1 extends ResultError,
    P1 = TBaseParams,
  >(
    resolver: Resolver<P1, S1, E1>,
  ): (params: TBaseParams) => MaybePromise<S1 | E1>;
  function middlewares<
    S1 extends ResultSuccess,
    S2 extends ResultSuccess,
    E1 extends ResultError,
    E2 extends ResultError,
    P1 = TBaseParams,
    P2 = P1,
  >(
    middleware1: MiddlewareFunction<P1, P2, S1, E1>,
    resolver: Resolver<P2, S2, E2>,
  ): (params: P1) => MaybePromise<S2 | E2>;
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
  const data = mws(
    ({ next, ...params }) => {
      if (!params.ctx.user) {
        return {
          error: 'neup',
        };
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
      return {
        data: 'hello ' + ctx.user,
      };
    },
  );
}
