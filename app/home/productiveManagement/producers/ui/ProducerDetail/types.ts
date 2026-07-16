import { Producer } from '@/data/entities/Producer';
import { Transaction } from '@/data/entities/Transaction';

export interface ExtendedReception extends Transaction {
  variety: string;
  formatName: string;
  price: number;
  netWeight: number;
  status?: string;
}

export interface ExtendedAdvance extends Transaction {
  status?: string;
}

export interface ProducerDetailData {
  producer: Producer;
  receptions: ExtendedReception[];
  advances: ExtendedAdvance[];
  settlements: Transaction[];
  trays: {
    balance: Record<string, number>;
    movements: Transaction[];
  };
}

export interface SectionProps {
  data: ProducerDetailData;
  onRefresh?: () => void;
}
