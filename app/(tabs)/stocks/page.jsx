import TabNav from '@/components/TabNav';
import { StocksContent } from '@/components/StocksContent';
import { stockMarketPrices } from '@/lib/data';


export default async function StocksPage() {
  return (
    <>
      <TabNav activeTab="stocks" />
      <StocksContent initialPrices={stockMarketPrices} />
    </>
  );
}
