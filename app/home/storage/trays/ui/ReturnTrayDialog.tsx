'use client';

import TrayAdjustmentDialog, { type TrayAdjustmentDialogProps } from './TrayAdjustmentDialog';

type ReturnTrayDialogProps = Omit<TrayAdjustmentDialogProps, 'mode'>;

export default function ReturnTrayDialog(props: ReturnTrayDialogProps) {
  return <TrayAdjustmentDialog {...props} mode="return" />;
}
