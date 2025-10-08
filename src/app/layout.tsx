import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yasban - Easy Builder for AI Tools',
  description: 'Build MCP servers visually, without code',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
