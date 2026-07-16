'use client';

import { useCallback, useEffect, useState } from 'react';
import { getReceptionDetail } from '@/app/actions/receptions';
import type { ReceptionDetailData } from '../types';

interface UseReceptionDetailOptions {
  receptionId?: string;
  open?: boolean;
}

interface UseReceptionDetailState {
  data: ReceptionDetailData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_ERROR_MESSAGE = 'No fue posible obtener el detalle de la recepción.';

export function useReceptionDetail({ receptionId, open = false }: UseReceptionDetailOptions): UseReceptionDetailState {
  const [data, setData] = useState<ReceptionDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!receptionId) {
      setData(null);
      setError('Identificador de recepción inválido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getReceptionDetail(receptionId);

      if (!result?.success || !result.data) {
        setData(null);
        setError(result?.error || DEFAULT_ERROR_MESSAGE);
        return;
      }

      setData(result.data);
    } catch (fetchError) {
      console.error('[useReceptionDetail] Error fetching detail:', fetchError);
      setData(null);
      setError(DEFAULT_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [receptionId]);

  useEffect(() => {
    if (open && receptionId) {
      void fetchDetail();
    }

    if (!open) {
      setError(null);
    }
  }, [open, receptionId, fetchDetail]);

  return {
    data,
    loading,
    error,
    refetch: fetchDetail,
  };
}
