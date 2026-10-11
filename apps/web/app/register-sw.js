'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = process.env.NODE_ENV === 'production' ? '/ApexNova' : '';
    navigator.serviceWorker.register(`${basePath}/sw.js`, {
      scope: `${basePath}/`,
    }).catch((error) => {
      console.error('ApexNova service worker registration failed:', error);
    });
  }, []);

  return null;
}
