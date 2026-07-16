import { listPendingReceptions, listPendingAdvances, listSettlements, getSettlementForEdit } from '@/app/actions/settlements';
import { getProducersSimpleListWithLabel } from '@/app/actions/producers';
import NewSettlementContent from './ui/NewSettlementContent';
import SettlementsGrid from './ui/SettlementsGrid';
import { redirect } from 'next/navigation';

interface SettlementsSearchParams {
  producerId?: string;
  page?: string;
  limit?: string;
  tab?: string;
  id?: string;
}

const parseNumberParam = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
};

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams?: Promise<SettlementsSearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const producerId = params?.producerId?.trim() ? params.producerId.trim() : undefined;
  const page = parseNumberParam(params?.page, 1);
  const limit = parseNumberParam(params?.limit, 25);
  const tab = params?.tab === 'new' ? 'new' : params?.tab === 'edit' ? 'edit' : 'list';
  const editId = params?.id;

  let editSettlementData = null;
  let effectiveProducerId = producerId;

  if (tab === 'edit' && editId) {
    editSettlementData = await getSettlementForEdit(editId);
    if (editSettlementData) {
      effectiveProducerId = editSettlementData.producerId;
    } else {
      // La liquidación no existe o ya no es borrador - redirigir a la lista
      redirect('/home/economicManagement/settlements?tab=list');
    }
  }

  const buildUrl = (newTab: string) => {
    const urlParams = new URLSearchParams();
    if (newTab === 'list' && producerId) urlParams.set('producerId', producerId);
    if (newTab === 'list' && page > 1) urlParams.set('page', page.toString());
    if (newTab === 'list' && limit !== 25) urlParams.set('limit', limit.toString());
    urlParams.set('tab', newTab);
    return `?${urlParams.toString()}`;
  };

  const [producerOptions, pendingReceptions, pendingAdvances, settlementsResult] = await Promise.all([
    getProducersSimpleListWithLabel(),
    listPendingReceptions({ 
      producerId: effectiveProducerId, 
      page, 
      limit,
      includeSettlementId: editId 
    }),
    listPendingAdvances({ 
      producerId: effectiveProducerId, 
      page, 
      limit,
      includeSettlementId: editId 
    }),
    listSettlements({ producerId, page, limit }),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <a
            href={buildUrl('list')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Liquidaciones
          </a>
          <a
            href={buildUrl('new')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Nueva Liquidación
          </a>
        </nav>
      </div>

      {tab === 'list' && (
        <div className="space-y-6">
          <SettlementsGrid rows={settlementsResult.rows} />
        </div>
      )}

      {tab === 'new' && (
        <div className="space-y-8">
          <NewSettlementContent
            producerOptions={producerOptions}
            selectedProducerId={producerId}
            receptions={pendingReceptions}
            advances={pendingAdvances}
            mode="create"
          />
        </div>
      )}

      {tab === 'edit' && editSettlementData && (
        <div className="space-y-8">
          <NewSettlementContent
            producerOptions={producerOptions}
            selectedProducerId={effectiveProducerId}
            receptions={pendingReceptions}
            advances={pendingAdvances}
            mode="edit"
            initialData={editSettlementData}
            settlementId={editId}
          />
        </div>
      )}
    </div>
  );
}
