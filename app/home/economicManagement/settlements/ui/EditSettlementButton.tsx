"use client";

import { useRouter } from 'next/navigation';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

interface EditSettlementButtonProps {
  settlementId: string;
}

export default function EditSettlementButton({ settlementId }: EditSettlementButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'edit');
    url.searchParams.set('id', settlementId);
    router.push(url.toString());
  };

  return (
    <IconButton
      icon="edit"
      variant="basicSecondary"
      size="sm"
      onClick={handleClick}
      title="Editar Liquidación"
    />
  );
}
