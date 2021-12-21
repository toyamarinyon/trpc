interface ProcedureOptions<TContext> {
  ctx: TContext;
  rawInput: unknown;
}

type Procedure<TContext> = (opts: ProcedureOptions<TContext>) => any;
type ProcedureRecord<TContext> = Record<string, Procedure<TContext>>;

export interface ProceduresByType<TContext> {
  queries?: ProcedureRecord<TContext>;
  mutations?: ProcedureRecord<TContext>;
}

export function createRouterWithContext<TContext extends {}>() {
  return function createRouter<TProcedures extends ProceduresByType<TContext>>(
    procedures: TProcedures,
  ): TProcedures {
    return procedures;
  };
}

export const createRouter = createRouterWithContext<unknown>();

export function createProcedure<TInputContext>() {
  return <TProcedure extends Procedure<TInputContext>>(fn: TProcedure) => {
    return fn;
  };
}

export function createProcedureWithZod() {}
