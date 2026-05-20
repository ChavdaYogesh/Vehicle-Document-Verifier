import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Vehicle Document Verifier',
  description: 'Manage and track your vehicle documents with automated expiration alerts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="main-container">
          {children}
        </main>
      </body>
    </html>
  );
}
