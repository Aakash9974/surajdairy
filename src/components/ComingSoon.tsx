export default function ComingSoon({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {note}
      </div>
    </div>
  );
}
