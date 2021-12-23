interface Ctx {}

/**
 * If type has a Promise, unwrap it. Otherwise return the original type
 */
type Await<T> = T extends PromiseLike<infer U> ? U : T;

/**
 * Ensure the type is a promise
 */
// type EnsurePromise<T> = T extends PromiseLike<unknown> ? T : Promise<T>;

interface ResultWithContext<Result = unknown, Context = unknown> {
  __blitz: true;
  value: Result;
  ctx: Context;
}

type PipeFn<Prev, Next, PrevCtx, NextCtx = PrevCtx> = (
  i: Await<Prev>,
  c: PrevCtx,
) => Next extends ResultWithContext
  ? never
  : Next | ResultWithContext<Next, NextCtx>;

function pipe<A, Z>(
  ab: (i: A, c: Ctx) => Z,
): (input: A, ctx: Ctx) => EnsurePromise<Z>;
function pipe<A, B, C, CA = Ctx, CB = CA, CC = CB>(
  ab: PipeFn<A, B, CA, CB>,
  bc: PipeFn<B, C, CB, CC>,
): (input: A, ctx: CA) => EnsurePromise<C>;

function pipe<A, Z>(
  ab: (i: A, c: Ctx) => Z,
): (input: A, ctx: Ctx) => EnsurePromise<Z>;
function pipe<A, B, C, CA = Ctx, CB = CA, CC = CB>(
  ab: PipeFn<A, B, CA, CB>,
  bc: PipeFn<B, C, CB, CC>,
): (input: A, ctx: CA) => EnsurePromise<C>;
function pipe<A, B, C, D, CA = Ctx, CB = CA, CC = CB, CD = CC>(
  ab: PipeFn<A, B, CA, CB>,
  bc: PipeFn<B, C, CB, CC>,
  cd: PipeFn<C, D, CC, CD>,
): (input: A, ctx: CA) => EnsurePromise<D>;
function pipe<A, B, C, D, E, CA = Ctx, CB = CA, CC = CB, CD = CC, CE = CD>(
  ab: PipeFn<A, B, CA, CB>,
  bc: PipeFn<B, C, CB, CC>,
  cd: PipeFn<C, D, CC, CD>,
  de: PipeFn<D, E, CD, CE>,
): (input: A, ctx: CA) => EnsurePromise<E>;
