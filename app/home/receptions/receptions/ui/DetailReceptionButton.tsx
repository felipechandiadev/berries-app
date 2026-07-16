'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { Button } from '@/app/baseComponents/Button/Button';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import type { ReceptionGridRow } from '@/app/actions/receptions';
import { ReceptionDetailLayout } from './ReceptionDetail';
import { useReceptionDetail } from './ReceptionDetail/hooks/useReceptionDetail';

interface DetailReceptionButtonProps {
  reception: ReceptionGridRow;
}

export default function DetailReceptionButton({ reception }: DetailReceptionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, loading, error, refetch } = useReceptionDetail({
    receptionId: reception.id,
    open,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const buttonTitle = useMemo(() => {
    const parts: string[] = ['Ver detalle'];
    if (reception.guideNumber) {
      parts.push(`Guía ${reception.guideNumber}`);
    }
    if (reception.producerName) {
      parts.push(`Productor ${reception.producerName}`);
    }
    return parts.join(' · ');
  }, [reception.guideNumber, reception.producerName]);

  const handleOpen = () => setOpen(true);
  const handleClose = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  return (
    <>
      <IconButton
        icon="more_horiz"
        variant="basicSecondary"
        size="xs"
        title={buttonTitle}
        ariaLabel={buttonTitle}
        onClick={handleOpen}
      />
      <Dialog
        open={open}
        onClose={handleClose}
        title=""
        size="custom"
        maxWidth="1280px"
        fullWidth
        scroll="paper"
        showCloseButton
        onCloseButtonClick={handleClose}
        contentStyle={{ height: '85vh', display: 'flex', flexDirection: 'column' }}
        hideActions
      >
        {loading && !data && (
          <div className="flex flex-1 items-center justify-center">
            <DotProgress />
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
            <p className="text-sm text-red-600 max-w-md">{error}</p>
            <div className="flex gap-2">
              <Button variant="outlined" onClick={handleRefetch}>
                Reintentar
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
        {data && (
          <ReceptionDetailLayout
            data={data}
            onClose={handleClose}
            onRefresh={handleRefetch}
            refreshing={loading}
          />
        )}
      </Dialog>
    </>
  );
}
