export default function Loading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* 外圈旋轉動畫 */}
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-rose-100 border-t-rose-500"></div>
        {/* 中間的小豬圖示 */}
        <div className="absolute text-2xl">🐷</div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">
        正在搬運您的資產...
      </p>
    </div>
  );
}