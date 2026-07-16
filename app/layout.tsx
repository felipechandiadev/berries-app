import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Providers } from './Providers';
import '../app/global.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'BerriesApp';
const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'BerriesApp Progressive Web App';
const themeColor = process.env.NEXT_PUBLIC_THEME_COLOR || '#5A8A00';

export const metadata: Metadata = {
  title: appName,
  description: appDescription,
  themeColor,
  icons: [
    {
      rel: 'icon',
      url: '/logo.svg',
    },
    {
      rel: 'apple-touch-icon',
      url: '/logo.png',
      sizes: '512x512',
    },
  ],
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className={dmSans.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
