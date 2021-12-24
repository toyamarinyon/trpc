const middlewareMarker = Symbol('middlewareMarker');
import * as z from 'zod';
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

interface MiddlewareOKResult<TParams> extends MiddlewareResultBase<TParams> {
  ok: true;
  success: unknown;
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

type MiddlewareFunctionParams<TInputParams> = TInputParams & {
  next: {
    (): Promise<MiddlewareResult<TInputParams>>;
    <T>(params: T): Promise<MiddlewareResult<T>>;
  };
};
type MiddlewareFunction<
  TInputParams,
  TNextParams,
  // TResult extends Result = never,
> = (
  params: MiddlewareFunctionParams<TInputParams>,
) => Promise<MiddlewareResult<TNextParams>>;

type Resolver<TParams, TResult extends Result> = (
  params: TParams,
) => MaybePromise<TResult>;

interface Params<TContext> {
  ctx: TContext;
  rawInput?: unknown;
}

function zod<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return async function parser<
    TOpts extends {
      next: (params: {
        __inputIn: z.input<TSchema>;
        __inputOut: z.output<TSchema>;
        input: z.output<TSchema>;
      }) => any;
    },
  >(opts: TOpts) {
    const { next, ...params } = opts;
    const rawInput: z.input<TSchema> = (params as any).rawInput;
    const result: z.output<TSchema> = await schema.parseAsync(rawInput);

    return next({
      ...params,
      __inputIn: rawInput,
      __inputOut: result,
      input: result,
    });
  };
}

// P = PARAMS
// R = RESULT
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

/////////// app //////////
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
        // return {
        //   data: {
        //     mw: 'says hello',
        //   },
        // };
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

  async function main() {
    const result = await mw({ ctx: {} });
    if ('error' in result) {
      result.error;
    }
  }
}

{
  // with zod
  const mw = mws(
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
    const result = await mw({ ctx: {} });
    if ('error' in result) {
      result.error;
    }
  }
}
