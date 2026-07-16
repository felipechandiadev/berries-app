import { getStorages } from '../../../actions/storages';
import ListStorages from './ui/ListStorages';

export default async function StoragesPage() {
  const result = await getStorages();

  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar almacenamientos
          </h2>
          <p className="text-gray-600">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <ListStorages storages={result.data as any[] || []} />
    </div>
  );
}
