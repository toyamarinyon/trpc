interface ProcedureOptions<TContext, TInput = unknown, TParsedInput = unknown> {
  _inputRaw: unknown;
  _inputBeforeTransform: TInput;
  ctx: TContext;
  input: TParsedInput;
}

type RichProcedure<TInputContext, TContext, TInput, TParsedInput, TOutput> = (
  opts: ProcedureOptions<TContext>,
) => any;

type ProcedureRecord<TContext> = Record<
  string,
  RichProcedure<TContext, unknown, unknown, unknown, unknown>
>;

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

export type ProcedureInputParserZodEsque<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};
