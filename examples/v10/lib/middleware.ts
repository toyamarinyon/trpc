const middlewareMarker = Symbol('middlewareMarker');
import { z } from 'zod';
///////////// utils //////////////
export type MaybePromise<T> = T | Promise<T>;

/**
 * JSON-RPC 2.0 Error codes
 *
 * `-32000` to `-32099` are reserved for implementation-defined server-errors.
 * For tRPC we're copying the last digits of HTTP 4XX errors.
 */
export const TRPC_ERROR_CODES_BY_KEY = {
  /**
   * Invalid JSON was received by the server.
   * An error occurred on the server while parsing the JSON text.
   */
  PARSE_ERROR: -32700,
  /**
   * The JSON sent is not a valid Request object.
   */
  BAD_REQUEST: -32600, // 400
  /**
   * Internal JSON-RPC error.
   */
  INTERNAL_SERVER_ERROR: -32603,
  // Implementation specific errors
  UNAUTHORIZED: -32001, // 401
  FORBIDDEN: -32003, // 403
  NOT_FOUND: -32004, // 404
  METHOD_NOT_SUPPORTED: -32005, // 405
  TIMEOUT: -32008, // 408
  PRECONDITION_FAILED: -32012, // 412
  PAYLOAD_TOO_LARGE: -32013, // 413
  CLIENT_CLOSED_REQUEST: -32099, // 499
} as const;

type ErrorCode = keyof typeof TRPC_ERROR_CODES_BY_KEY;

//////// response shapes //////////

interface ResultSuccess {
  data: unknown;
}
interface ResultErrorData {
  code: ErrorCode;
  cause?: Error;
}
interface ResultError {
  error: ResultErrorData;
}

type Result = ResultSuccess | ResultError;

///////// middleware implementation ///////////
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

interface Procedure<TBaseParams, ResolverParams, ResolverResult> {
  __params: ResolverParams;
  call(params: TBaseParams): MaybePromise<ResolverResult>;
}

function pipedResolver<TContext>() {
  type TBaseParams = Params<TContext>;

  function middlewares<TResult extends Result>(
    resolver: Resolver<TBaseParams, TResult>,
  ): Procedure<TBaseParams, TBaseParams, TResult>;
  function middlewares<
    TResult extends Result,
    MW1Params extends TBaseParams = TBaseParams,
    MW1Result extends Result = never,
  >(
    middleware1: MiddlewareFunction<TBaseParams, MW1Params, MW1Result>,
    resolver: Resolver<MW1Params, TResult>,
  ): Procedure<
    TBaseParams,
    MW1Params,
    ExcludeMiddlewareResult<TResult | MW1Result>
  >;
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
  ): Procedure<
    TBaseParams,
    MW2Params,
    ExcludeMiddlewareResult<TResult | MW1Result | MW2Result>
  >;
  function middlewares(...args: any): any {
    throw new Error('Unimplemented');
  }

  return middlewares;
}
///////////// reusable middlewares /////////

/***
 * Utility for creating a zod middleware
 */
function zod<TInputParams, TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): MiddlewareFunction<
  TInputParams,
  TInputParams & { input: z.output<TSchema> },
  { error: { code: 'BAD_REQUEST'; cause: z.ZodError<z.input<TSchema>> } }
> {
  type zInput = z.input<TSchema>;
  type zOutput = z.output<TSchema>;
  return async function parser(opts) {
    const { next, ...params } = opts;
    const rawInput: zInput = (params as any).rawInput;
    const result: z.SafeParseReturnType<zInput, zOutput> =
      await schema.safeParseAsync(rawInput);
    if (result.success) {
      return next({
        ...opts,
        input: result,
      });
    }
    const cause = (result as z.SafeParseError<zInput>).error;
    return {
      error: {
        code: 'BAD_REQUEST',
        cause,
      },
    };
  };
}

type ExcludeErrorLike<T> = T extends ResultError ? never : T;
type OnlyErrorLike<T> = T extends ResultError ? T : never;

/**
 * Utility for creating a middleware that swaps the context around
 */

function contextSwapper<TInputContext>() {
  return function factory<TNewContext, TError extends ResultError>(
    newContext: (
      params: Params<TInputContext>,
    ) => Promise<{ ctx: TNewContext } | TError>,
  ) {
    return function middleware<TInputParams>(): MiddlewareFunction<
      TInputParams,
      Omit<TInputParams, 'ctx'> & { ctx: TNewContext },
      TError
    > {
      throw new Error('Unimpl');
    };
  };
}

////////////////////// app ////////////////////////////

// boilerplate for each app, in like a utils
const pipe = pipedResolver<TestContext>();
const swapContext = contextSwapper<TestContext>();

// context
type TestContext = {
  user?: {
    id: string;
  };
};

////////// app middlewares ////////
const isAuthed = swapContext(async (params) => {
  if (Math.random() < 0.3) {
    return {
      error: {
        code: 'UNAUTHORIZED',
      },
    };
  }
  return {
    ctx: {
      ...params.ctx,
      user: params.ctx.user,
    },
  };
});

/////////// app resolvers //////////
{
  // creating a resolver that only has response data
  const data = pipe(() => {
    return {
      data: 'ok',
    };
  });
}

{
  // creating a resolver with a set of reusable middlewares
  const procedure = pipe(
    // swaps context to make sure the user is authenticated
    isAuthed(),
    // adds zod input validation
    zod(
      z.object({
        hello: z.string(),
      }),
    ),
    (params) => {
      if (Math.random() > 0.5) {
        return {
          error: {
            code: 'INTERNAL_SERVER_ERROR' as const,
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
    // if you hover result we can see that we can infer both the result and every possible error
  }
}
