export const onRequest = async ({ request, env }) => {
     const url = new URL(request.url);
     if (url.pathname.includes('.')) {
       return env.ASSETS.fetch(request);
     }
     return env.ASSETS.fetch(
       new Request(url.origin + '/', { headers: request.headers })
     );
   };
