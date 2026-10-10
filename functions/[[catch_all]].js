export const onRequest = async ({ request, env }) => {
          const url = new URL(request.url);
          return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
        };
