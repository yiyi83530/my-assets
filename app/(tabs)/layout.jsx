'use client';

import TabNav from '@/components/TabNav';
import { usePathname } from 'next/navigation';

export default function TabsLayout({ children }) {
  const pathname = usePathname();
  const activeTab = pathname === '/assets' ? 'assets' : 'stocks';

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <TabNav activeTab={activeTab} />
      {children}
    </div>
  );
}
