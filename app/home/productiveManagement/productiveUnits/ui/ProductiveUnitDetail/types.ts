import { Transaction } from '@/data/entities/Transaction';

export interface ProductiveUnitDetailUnit {
  id: string;
  name: string;
  location?: string;
}

export interface ProductiveUnitDetailProducer {
  id: string;
  name: string;
  dni: string;
  mail?: string;
  phone?: string;
}

export interface ExtendedReception extends Transaction {
  variety: string;
  formatName: string;
  price: number;
  netWeight: number;
  status?: string;
  producerId?: string;
  producerName: string;
}

export interface ExtendedAdvance extends Transaction {
  status?: string;
  producerId?: string;
  producerName: string;
}

export interface ExtendedSettlement extends Transaction {
  producerId?: string;
  producerName: string;
}

export interface ProductiveUnitDetailData {
  unit: ProductiveUnitDetailUnit;
  producers: ProductiveUnitDetailProducer[];
  receptions: ExtendedReception[];
  advances: ExtendedAdvance[];
  settlements: ExtendedSettlement[];
}

export interface SectionProps {
  data: ProductiveUnitDetailData;
  onRefresh?: () => void;
}
