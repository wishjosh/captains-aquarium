const url=new URL(location.href);url.searchParams.set('trial','garden');history.replaceState(null,'',url);await import('./game.js?v=2026-11-03-garden-2');
