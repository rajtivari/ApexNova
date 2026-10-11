import './globals.css';
import RegisterSW from './register-sw';

export const metadata = {
  title: 'ApexNova // Competitive Operations',
  description: 'ApexNova tournament operations for Free Fire and BGMI.',
  manifest: '/ApexNova/manifest.webmanifest',
  icons: { icon: '/ApexNova/icon.svg' },
  themeColor: '#ff5a36',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
