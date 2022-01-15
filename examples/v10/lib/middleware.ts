const middlewareMarker = Symbol('middlewareMarker');
import { z } from 'zod';
// utils
export type MaybePromise<T> = T | Promise<T>;
export type ProcedureType = 'query';
export type ThenArg<T> = T extends PromiseLike<infer U> ? ThenArg<U> : T;
export type inferAsyncReturnType<TFunction extends (...args: any) => any> =
  ThenArg<ReturnType<TFunction>>;
export type format<T> = {
  [k in keyof T]: T[k];
};
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
export type SubType<Base, Condition> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
  }[keyof Base]
>;

// ..impl
interface MiddlewareResultBase<TParams> {
  /**
   * All middlewares should pass through their `next()`'s output.
   * Requiring this marker makes sure that can't be forgotten at compile-time.
   */
  readonly marker: typeof middlewareMarker;
  TParams: TParams;
}

interface MiddlewareOKResult<TParams>
  extends MiddlewareResultBase<TParams>,
    ResultSuccess {}

interface MiddlewareErrorResult<TParams>
  extends MiddlewareResultBase<TParams>,
    ResultError {}

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

type MiddlewareFunctionParams<TInputParams> = TInputParams & {
  next: {
    (): Promise<MiddlewareResult<TInputParams>>;
    <T>(params: T): Promise<MiddlewareResult<T>>;
  };
};
type MiddlewareFunction<
  TInputParams,
  TNextParams,
  TResult extends Result = never,
> = (
  params: MiddlewareFunctionParams<TInputParams>,
) => Promise<MiddlewareResult<TNextParams> | TResult>;

type Resolver<TParams, TResult extends Result> = (
  params: TParams,
) => MaybePromise<TResult>;

interface Params<TContext> {
  ctx: TContext;
  rawInput?: unknown;
}

type ExcludeMiddlewareResult<T> = T extends MiddlewareResult<any> ? never : T;

// P = PARAMS
// R = RESULT
function createMiddlewares<TContext>() {
  type TBaseParams = Params<TContext>;
  function middlewares<TResult extends Result>(
    resolver: Resolver<TBaseParams, TResult>,
  ): (params: TBaseParams) => MaybePromise<TResult>;
  function middlewares<
    TResult extends Result,
    MW1Params extends TBaseParams = TBaseParams,
    MW1Result extends Result = never,
  >(
    middleware1: MiddlewareFunction<TBaseParams, MW1Params, MW1Result>,
    resolver: Resolver<MW1Params, TResult>,
  ): (
    params: TBaseParams,
  ) => MaybePromise<ExcludeMiddlewareResult<TResult | MW1Result>>;
  function middlewares<
    TResult extends Result,
    MW1Params extends TBaseParams = TBaseParams,
    MW1Result extends Result = never,
    MW2Params extends TBaseParams = MW1Params,
    MW2Result extends Result = never,
  >(
    middleware1: MiddlewareFunction<TBaseParams, MW1Params, MW1Result>,
    middleware2: MiddlewareFunction<MW1Params, MW2Params, MW2Result>,
    resolver: Resolver<MW2Params, TResult>,
  ): (
    params: TBaseParams,
  ) => MaybePromise<ExcludeMiddlewareResult<TResult | MW1Result | MW2Result>>;
  function middlewares(...args: any): any {
    throw new Error('Unimplemented');
  }

  return middlewares;
}
///////////// reusable middlewares /////////

function zod<TInput, TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): MiddlewareFunction<
  TInput,
  TInput & { input: z.input<TSchema> },
  { error: z.ZodError<z.input<TSchema>> }
> {
  type zInput = z.input<TSchema>;
  type zOutput = z.output<TSchema>;
  return async function parser(opts) {
    const { next, ...params } = opts;
    const rawInput: zInput = (params as any).rawInput;
    const r2: z.SafeParseReturnType<zInput, zOutput> =
      await schema.safeParseAsync(rawInput);
    if (r2.success) {
      return next({
        ...opts,
        input: r2,
      });
    }
    const error = (r2 as z.SafeParseError<zInput>).error;
    return {
      error,
    };
  };
}

type ExcludeErrorLike<T> = T extends ResultError ? never : T;
type OnlyErrorLike<T> = T extends ResultError ? T : never;

function contextSwapper<TInputContext>() {
  return function swapContext<
    TParams extends Params<TInputContext>,
    TNewContext,
  >(
    newContext: (params: TParams) => Promise<TNewContext>,
  ): MiddlewareFunction<
    TParams,
    Omit<TParams, 'ctx'> & { ctx: ExcludeErrorLike<TNewContext> },
    OnlyErrorLike<TNewContext>
  > {
    return null as any;
  };
}

/////////// app //////////
type TestContext = {
  user?: {
    id: string;
  };
};

const swapContext = contextSwapper<TestContext>();
const isAuthed = swapContext(async (params) => {
  if (!params.ctx.user) {
    return {
      error: 'UNAUTHORIZED' as const,
    };
  }
  return {
    ...params.ctx,
    user: params.ctx.user,
  };
});

// only resolver
const mws = createMiddlewares<TestContext>();
{
  const data = mws(() => {
    return {
      data: 'ok',
    };
  });
}

{
  // with zod
  const resolve = mws(
    isAuthed,
    zod(
      z.object({
        hello: z.string(),
      }),
    ),
    (params) => {
      if (Math.random() > 0.5) {
        return {
          error: {
            code: 'some code',
          },
        };
      }
      return {
        data: {
          greeting: 'hello ' + params.ctx.user.id ?? params.input.hello,
        },
      };
    },
  );

  async function main() {
    const result = await resolve({ ctx: {} });
    if ('error' in result) {
      result.error;
    }
  }
}
