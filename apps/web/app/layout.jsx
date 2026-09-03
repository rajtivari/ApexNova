import './globals.css';
import RegisterSW from './register-sw';
export const metadata = { title: 'ApexNova // Competitive Operations', description: 'Mock-only Free Fire and BGMI tournament command center' };
export default function RootLayout({ children }) { return <html lang="en"><body><RegisterSW />{children}</body></html>; }
