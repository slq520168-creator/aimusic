import { rewrite } from '@vercel/functions';

export const config = {
  matcher: '/(.*)'
};

export default function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  if (host !== 'yxdoc.vercel.app') return;
  const url = new URL(request.url);
  const path = url.pathname === '/' ? '/shop.html' : url.pathname;
  const target = new URL('https://globalyouxuan-order.pages.dev' + path + url.search);
  return rewrite(target);
}
