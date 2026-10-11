'use client';

import { useEffect } from 'react';

// ApexNova is a frequently updated static app. Remove the old offline cache so
// stale JavaScript cannot keep calling an outdated API URL after deployment.
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => {
        if (!('caches' in window)) return;
        return caches.keys().then((keys) => Promise.all(
          keys.filter((key) => key.startsWith('apexnova-')).map((key) => caches.delete(key)),
        ));
      })
      .catch((error) => {
        console.warn('ApexNova cache cleanup failed:', error);
      });
  }, []);

  return null;
}
