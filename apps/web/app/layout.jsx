import './globals.css';
import RegisterSW from './register-sw';

export const metadata = {
  title: 'APEX NOVA — Rise. Dominate. Conquer.',
  description: "India's competitive Free Fire and BGMI tournament arena. Rise. Dominate. Conquer.",
  manifest: '/ApexNova/manifest.json',
  icons: { icon: '/ApexNova/icon.svg' },
  themeColor: '#02020C',
  applicationName: 'APEX NOVA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Exo+2:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
