import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <DotProgress size={16} />
    </div>
  );
}
