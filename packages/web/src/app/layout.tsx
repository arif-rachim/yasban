import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

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
    <html lang="en" suppressHydrationWarning className="flex flex-col h-full overflow-auto">
      <body className="antialiased overflow-auto flex flex-col h-full" >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
