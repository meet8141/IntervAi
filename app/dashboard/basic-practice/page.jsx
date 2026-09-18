import dynamic from 'next/dynamic';

const BasicPractice = dynamic(() => import('./BasicPracticeClient'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-[#faf6f1] flex items-center justify-center">
      <p className="text-[#4a6b5b] animate-pulse">Loading practice session…</p>
    </div>
  ),
});

export default function BasicPracticePage() {
  return <BasicPractice />;
}
