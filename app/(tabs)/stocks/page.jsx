import { StocksContent } from '@/components/StocksContent';
import { stockMarketPrices } from '@/lib/data';


export default async function StocksPage() {
  return (
    <>
      <StocksContent initialPrices={stockMarketPrices} />
    </>
  );
}
