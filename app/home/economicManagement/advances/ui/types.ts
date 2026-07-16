export interface ProducerOption {
  id: string;
  label: string;
}

export interface AdminBankAccountOption {
  id: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  alias?: string | null;
}

export interface SeasonOption {
  id: string;
  name: string;
}
