'use client';

import { HoldingSnapshotModal } from '@/components/stocks/HoldingSnapshotModal';
import { IndustryEditorModal } from '@/components/stocks/IndustryEditorModal';
import { StockConfirmationModals } from '@/components/stocks/StockConfirmationModals';

export function StockModals(props) {
  return (
    <>
      <IndustryEditorModal {...props} />
      <HoldingSnapshotModal {...props} />
      <StockConfirmationModals {...props} />
    </>
  );
}
