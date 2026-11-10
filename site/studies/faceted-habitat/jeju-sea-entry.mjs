const url=new URL(location.href);
url.searchParams.set('trial','garden');
url.searchParams.set('shoal','fin');
url.searchParams.set('environment','jeju');
history.replaceState(null,'',url);
await import('./jeju-sea-game.js?v=2026-11-10-life-2');
