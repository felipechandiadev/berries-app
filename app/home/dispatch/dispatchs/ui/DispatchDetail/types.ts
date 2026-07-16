import { Transaction, DispatchMetadata } from '@/data/entities/Transaction';

export interface DispatchDetailProps {
  dispatchId: string;
  onClose: () => void;
}

export type DispatchWithRelations = Transaction & {
  metadata: DispatchMetadata;
};
