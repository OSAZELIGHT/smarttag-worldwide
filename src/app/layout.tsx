import './globals.css';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
export const metadata = { title: 'Smarttag | Universal View', description: 'Engineered by GC Smart Technology' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="{inter.className} bg-black text-white antialiased">{children}</body>
    </html>
  );
}
