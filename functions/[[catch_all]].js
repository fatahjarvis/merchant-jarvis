export const onRequest = async ({ request, env }) => {
     const url = new URL(request.url);
     return env.ASSETS.fetch(
       new Request(url.origin + '/', { headers: request.headers })
     );
   };
