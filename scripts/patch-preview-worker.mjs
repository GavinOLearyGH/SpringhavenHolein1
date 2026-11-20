// The coaching PWA and course share a GitHub Pages origin. Its cache-first
// worker must leave course release loading to the course/browser, not its shell.
export function protectCourseRoutes(source){
    const marker='// Course release boundary.';
    if(source.includes(marker))return source;
    const handler="self.addEventListener('fetch',event=>{";
    if(!source.includes(handler))throw Error('Review the preview worker fetch handler before patching.');
    return source.replace(handler,handler+`\n  ${marker}
  const requestURL=new URL(event.request.url),scopeURL=new URL('./',self.registration.scope);
  if(requestURL.origin===scopeURL.origin&&['course/','core/'].some(route=>requestURL.pathname.startsWith(scopeURL.pathname+route)))return;
  `);
}
