import { signIn, signOut, useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ReactQueryDevtools } from 'react-query/devtools';
import { trpc } from '../utils/trpc';

function AddMessageForm() {
  const addPost = trpc.useMutation('post.add');
  const utils = trpc.useContext();
  const { data: session } = useSession();

  const userName = session?.user?.name;
  if (!userName) {
    return (
      <button onClick={() => signIn()} data-testid="signin">
        Sign In to write
      </button>
    );
  }
  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          /**
           * In a real app you probably don't want to use this manually
           * Checkout React Hook Form - it works great with tRPC
           * @link https://react-hook-form.com/
           */

          const input = {
            text: message,
          };
          try {
            await addPost.mutateAsync(input);
            setMessage('');
            onMessagePost();
          } catch {}
        }}
      >
        <fieldset disabled={addPost.isLoading}>
          <div className="flex rounded bg-gray-500 px-3 py-2 text-lg text-gray-200 w-full items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-transparent flex-1 outline-0"
              rows={message.split(/\r|\n/).length}
              id="text"
              name="text"
              autoFocus
              onKeyDown={() => {
                utils.client.mutation('post.isTyping', {
                  typing: true,
                });
              }}
              onBlur={() => {
                utils.client.mutation('post.isTyping', {
                  typing: false,
                });
              }}
            />
            <div>
              <button type="submit" className="px-4 bg-indigo-500 rounded py-1">
                Submit
              </button>
            </div>
          </div>
        </fieldset>
        {addPost.error && (
          <p style={{ color: 'red' }}>{addPost.error.message}</p>
        )}
      </form>
    </>
  );
}

export default function IndexPage() {
  const postsQuery = trpc.useInfiniteQuery(['post.infinite', {}], {
    getPreviousPageParam: (d) => d.prevCursor,
  });
  const utils = trpc.useContext();
  const { hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage } =
    postsQuery;

  // list of messages that are rendered
  const [messages, setMessages] = useState(() => {
    const msgs = postsQuery.data?.pages.map((page) => page.items).flat();
    return msgs;
  });
  type Post = NonNullable<typeof messages>[number];
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  // fn to add and dedupe new messages onto state
  const addMessages = useCallback((incoming?: Post[]) => {
    setMessages((current) => {
      const map: Record<Post['id'], Post> = {};
      for (const msg of current ?? []) {
        map[msg.id] = msg;
      }
      for (const msg of incoming ?? []) {
        map[msg.id] = msg;
      }
      return Object.values(map).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    });
  }, []);

  // when new data from `useInfiniteQuery`, merge with current state
  useEffect(() => {
    const msgs = postsQuery.data?.pages.map((page) => page.items).flat();
    addMessages(msgs);
  }, [postsQuery.data?.pages, addMessages]);

  const scrollToBottomOfList = useCallback(() => {
    if (scrollTargetRef.current == null) {
      return;
    }

    scrollTargetRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [scrollTargetRef]);
  useEffect(() => {
    scrollToBottomOfList();
  }, []);
  // subscribe to new posts and add
  trpc.useSubscription(['post.onAdd'], {
    onNext(post) {
      addMessages([post]);
    },
    onError(err) {
      console.error('Subscription error:', err);
      // we might have missed a message - invalidate cache
      utils.queryClient.invalidateQueries();
    },
  });

  const [currentlyTyping, setCurrentlyTyping] = useState<string[]>([]);
  trpc.useSubscription(['post.whoIsTyping'], {
    onNext(data) {
      setCurrentlyTyping(data);
    },
  });

  return (
    <>
      <Head>
        <title>Prisma Starter</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen md:flex-row flex-col">
        <section className="w-full md:w-72 bg-gray-800 flex flex-col">
          <div className="flex-1 overflow-y-hidden">
            <div className="flex flex-col h-full divide-y divide-gray-700">
              <header className="p-4">
                <h1 className="text-3xl font-bold text-gray-50">
                  tRPC WebSocket starter
                </h1>
                <p className="text-sm text-gray-400">
                  Showcases WebSocket + subscription support
                  <br />
                  <a
                    className="text-gray-100"
                    href="https://github.com/trpc/trpc/tree/main/examples/next-prisma-starter-websockets"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Source on GitHub
                  </a>
                </p>
              </header>
              <div className="hidden md:block text-gray-400 p-4 space-y-6 flex-1 overflow-y-auto">
                <article>
                  <h2 className="text-lg text-gray-200">Introduction</h2>
                  <ul className="space-y-3">
                    <li>Open inspector and head to Network tab</li>
                    <li>All client requests are handled through WebSockets</li>
                    <li>
                      We have a simple backend subscription on new messages that
                      adds the newly added message to the current state
                    </li>
                    <li>
                      <Link href="/about">
                        <a className="text-gray-100">
                          Go to other page that displays a random number
                        </a>
                      </Link>
                      (cancels subscription)
                    </li>
                  </ul>
                </article>
                {userName && (
                  <article>
                    <h2 className="text-lg text-gray-200">User information</h2>
                    <ul className="space-y-2">
                      <li className="text-lg">You&apos;re {userName}</li>
                      <li>
                        <button onClick={() => signOut()}>Sign Out</button>
                      </li>
                    </ul>
                  </article>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:block h-16 flex-shrink-0"></div>
        </section>
        <div className="md:h-screen flex-1">
          <section className="bg-gray-700 h-full p-4 flex flex-col justify-end space-y-4">
            <div className="overflow-y-scroll">
              <h2>{postsQuery.status === 'loading' && '(loading)'}</h2>
              <button
                data-testid="loadMore"
                onClick={() => fetchPreviousPage()}
                disabled={!hasPreviousPage || isFetchingPreviousPage}
                className="text-gray-400"
              >
                {isFetchingPreviousPage
                  ? 'Loading more...'
                  : hasPreviousPage
                  ? 'Load More'
                  : 'Nothing more to load'}
              </button>
              <div className="space-y-4">
                {messages?.map((item) => (
                  <article key={item.id} className=" text-gray-50">
                    <header className="flex space-x-2 text-sm">
                      <h3 className="text-md">
                        {item.source === 'RAW' ? (
                          item.name
                        ) : (
                          <a
                            href={`https://github.com/${item.name}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.name}
                          </a>
                        )}
                      </h3>
                      <span className="text-gray-500">
                        {new Intl.DateTimeFormat('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(item.createdAt)}
                      </span>
                    </header>
                    <p className="text-xl leading-tight whitespace-pre-line">
                      {item.text}
                    </p>
                  </article>
                ))}
                <div ref={scrollTargetRef}></div>
              </div>
            </div>
            <div className="w-full">
              <AddMessageForm onMessagePost={() => scrollToBottomOfList()} />
              <p className="h-2 italic text-gray-400">
                {currentlyTyping.length
                  ? `${currentlyTyping.join(', ')} typing...`
                  : ''}
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && (
              <div className="hidden md:block">
                <ReactQueryDevtools initialIsOpen={false} />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * If you want to statically render this page
 * - Export `appRouter` & `createContext` from [trpc].ts
 * - Make the `opts` object optional on `createContext()`
 *
 * @link https://trpc.io/docs/ssg
 */
// export const getStaticProps = async (
//   context: GetStaticPropsContext<{ filter: string }>,
// ) => {
//   const ssg = createSSGHelpers({
//     router: appRouter,
//     ctx: await createContext(),
//   });
//
//   await ssg.fetchQuery('post.all');
//
//   return {
//     props: {
//       trpcState: ssg.dehydrate(),
//       filter: context.params?.filter ?? 'all',
//     },
//     revalidate: 1,
//   };
// };
