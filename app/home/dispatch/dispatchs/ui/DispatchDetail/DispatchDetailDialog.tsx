'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { getDispatchById } from '@/app/actions/dispatches';
import { DispatchDetailLayout } from './DispatchDetailLayout';
import { DispatchWithRelations } from './types';

interface DispatchDetailDialogProps {
  open: boolean;
  onClose: () => void;
  dispatchId: string | null;
}

export const DispatchDetailDialog: React.FC<DispatchDetailDialogProps> = ({
  open,
  onClose,
  dispatchId,
}) => {
  const [data, setData] = useState<DispatchWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!dispatchId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDispatchById(dispatchId);
      if (response.success && response.data) {
        setData(response.data as DispatchWithRelations);
      } else {
        setError(response.error || 'Error al cargar los detalles del despacho');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && dispatchId) {
      loadData();
    } else {
      setData(null);
    }
  }, [open, dispatchId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xxl"
      scroll="body"
      hideActions
      title=""
    >
      <div className="h-[80vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <DotProgress />
          </div>
        ) : data ? (
          <DispatchDetailLayout
            data={data}
            onClose={onClose}
            onRefresh={loadData}
            
          />
        ) : null}
      </div>
    </Dialog>
  );
};
