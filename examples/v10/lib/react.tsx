import { TRPCRequestOptions } from '@trpc/client';
import {
  hashQueryKey,
  QueryClient,
  useInfiniteQuery as __useInfiniteQuery,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  useMutation as __useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery as __useQuery,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import type { ProceduresByType } from './server';

export interface TRPCUseQueryBaseOptions extends TRPCRequestOptions {
  /**
   * Opt out of SSR for this query by passing `ssr: false`
   */
  ssr?: boolean;
}
export interface UseTRPCQueryOptions<TPath, TInput, TOutput, TError>
  extends UseQueryOptions<TOutput, TError, TOutput, [TPath, TInput]>,
    TRPCUseQueryBaseOptions {}

export function createReactQueryHooks<
  TProceduresByType extends ProceduresByType<any>,
>() {
  // TODO
  // function useQuery<TPath extends keyof TProceduresByType['queries'] & string>(
  //   pathAndInput: [path: TPath, ...args: inferHandlerInput<TQueries[TPath]>],
  //   opts?: UseTRPCQueryOptions<
  //     TPath,
  //     TQueryValues[TPath]['input'],
  //     TQueryValues[TPath]['output'],
  //     TError
  //   >,
  // ): UseQueryResult<TQueryValues[TPath]['output'], TError> {
  //   const { client, isPrepass, queryClient, prefetchQuery } = useContext();

  //   return __useQuery(
  //     pathAndInput as any,
  //     () => (client as any).query(...getClientArgs(pathAndInput, opts)),
  //     opts,
  //   );
  // }

  return {
    // useQuery,
  };
}
