interface ProcedureOptions<TContext> {
  ctx: TContext;
  rawInput: unknown;
}

type Procedure<TContext> = (opts: ProcedureOptions<TContext>) => any;
type ProcedureRecord<TContext> = Record<string, Procedure<TContext>>;

interface Procedures<TContext> {
  queries?: ProcedureRecord<TContext>;
  mutations?: ProcedureRecord<TContext>;
}

export function createRouterWithContext<TContext extends {}>() {
  return function createRouter<TProcedures extends Procedures<TContext>>(
    procedures: TProcedures,
  ): TProcedures {
    return procedures;
  };
}

export const createRouter = createRouterWithContext<unknown>();

export function createProcedure<TContext>() {
  return <TProcedure extends Procedure<TContext>>(fn: TProcedure) => {
    return fn;
  };
}
