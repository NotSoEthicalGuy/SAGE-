'use client';

export default function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-6 shadow-glass text-slate-900">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-slate-600">{description || 'This module is scaffolded and ready for feature implementation.'}</p>
    </div>
  );
}
