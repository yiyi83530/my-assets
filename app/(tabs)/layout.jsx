'use client';

import TabNav from '@/components/TabNav';
import { usePathname } from 'next/navigation';

export default function TabsLayout({ children }) {
  const pathname = usePathname();
  const activeTab = pathname === '/assets' ? 'assets' : 'stocks';

  return (
    <div className={activeTab === 'stocks' ? 'space-y-3' : 'space-y-6'}>
      <TabNav activeTab={activeTab} />
      {children}
    </div>
  );
}
