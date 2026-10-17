// ============================================================
// SavingsChart — monthly amount paid vs amount saved
// ============================================================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR } from '../../utils/format';

const SERIES = [
  { key: 'spend', name: 'You paid', color: '#8FB8B8' },
  { key: 'savings', name: 'You saved', color: 'var(--color-primary)' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-lowest clinical-shadow ghost-border rounded-lg px-3 py-2 text-sm">
      <div className="font-semibold text-on-surface mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-6">
          <span className="text-on-surface/70">{entry.name}</span>
          <span className="font-semibold text-on-surface">{formatINR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SavingsChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-center bg-surface-low rounded-xl border border-dashed border-outline-variant px-6">
        <p className="font-semibold text-on-surface/70">No savings history yet</p>
        <p className="text-sm text-on-surface/70 mt-1">Your monthly savings will appear here after your first completed order.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 mb-3 text-sm">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2 text-on-surface/70">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ left: -12, right: 4 }}>
            <CartesianGrid stroke="var(--color-outline-variant)" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} tickFormatter={(v) => `₹${v}`} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={32} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
