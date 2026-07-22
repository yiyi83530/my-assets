'use client';

import dynamic from 'next/dynamic';

const HoldingSnapshotModal = dynamic(
  () => import('@/components/stocks/HoldingSnapshotModal').then((module) => module.HoldingSnapshotModal),
  { ssr: false }
);
const IndustryEditorModal = dynamic(
  () => import('@/components/stocks/IndustryEditorModal').then((module) => module.IndustryEditorModal),
  { ssr: false }
);
const StockConfirmationModals = dynamic(
  () => import('@/components/stocks/StockConfirmationModals').then((module) => module.StockConfirmationModals),
  { ssr: false }
);

export function StockModals(props) {
  return (
    <>
      {props.showIndustryEditor && <IndustryEditorModal {...props} />}
      {props.showHoldingSnapshotModal && <HoldingSnapshotModal {...props} />}
      {(props.pendingCostChange || props.deleteId) && <StockConfirmationModals {...props} />}
    </>
  );
}
