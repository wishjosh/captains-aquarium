const url=new URL(location.href);
url.searchParams.set('trial','garden');
url.searchParams.set('shoal','fin');
history.replaceState(null,'',url);
await import('./garden-shoal-game.js?v=2026-11-03-garden-shoal-1');
