import TabNav from '@/components/TabNav';

export default function TabsLayout({ children }) {
  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* 依照 route 自己決定 active tab，避免 client state */}
      {children}
    </div>
  );
}

