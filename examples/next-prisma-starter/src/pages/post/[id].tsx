import { useRouter } from 'next/router';
import { trpc } from 'utils/trpc';
import NextError from 'next/error';
import { ClientSuspense, ErrorBoundary } from 'components/ClientSuspense';

function PostView() {
  const id = useRouter().query.id as string;
  const postQuery = trpc.useQuery(['post.byId', { id }], {
    suspense: true,
    retry() {
      return false;
    },
  });

  const { data } = postQuery;
  return (
    <>
      <h1>{data.title}</h1>
      <em>Created {data.createdAt.toLocaleDateString()}</em>

      <p>{data.text}</p>

      <h2>Raw data:</h2>
      <pre>{JSON.stringify(data, null, 4)}</pre>
    </>
  );
}

export default function PostViewPage() {
  return (
    <ClientSuspense fallback={'Loading a great post...'}>
      <PostView />
    </ClientSuspense>
  );
}
