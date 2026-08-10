'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Terminal, Radio, ArrowUpRight, ShieldCheck, ShieldAlert, Plus, Trash2 } from 'lucide-react';

interface Metric {
  id: string;
  url: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  createdAt: string;
}

interface Target {
  id: string;
  url: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${API_BASE}/targets`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (e) {
      console.error('Failed to fetch targets:', e);
    }
  };

  useEffect(() => {
    fetchTargets();

    const eventSource = new EventSource(`${API_BASE}/metrics/stream`);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onmessage = (event) => {
      try {
        const newMetric: Metric = JSON.parse(event.data);
        setMetrics((prev) => [newMetric, ...prev].slice(0, 30));
      } catch (e) {
        console.error('Failed to parse SSE metric event:', e);
      }
    };
    eventSource.onerror = () => setIsConnected(false);

    return () => eventSource.close();
  }, []);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });
      if (res.ok) {
        setNewUrl('');
        fetchTargets();
      }
    } catch (e) {
      console.error('Failed to add target:', e);
    }
  };

  const handleRemoveTarget = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/targets/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTargets();
    } catch (e) {
      console.error('Failed to remove target:', e);
    }
  };

  const chartData = [...metrics].reverse().map((m) => ({
    time: new Date(m.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    responseTime: m.responseTime,
    url: m.url.replace('https://', '').replace('http://', ''),
  }));

  const latestMetrics = metrics.slice(0, 8);

  return (
      <main className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black antialiased p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-zinc-400" />
                <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                contrl // v0.6.7
              </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono">
                uptime_pulse
              </h1>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 bg-zinc-950 border border-zinc-800 font-mono text-xs">
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-white animate-pulse' : 'text-zinc-600'}`} />
              <span className="uppercase tracking-wider text-zinc-300">
              {isConnected ? 'работает' : 'выключено'}
            </span>
            </div>
          </header>

          <section className="bg-zinc-950 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                добавить url
              </h2>
            </div>

            <form onSubmit={handleAddTarget} className="flex gap-2">
              <input
                  type="text"
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <button
                  type="submit"
                  className="bg-zinc-100 text-black px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-zinc-300 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {targets.map((t) => (
                  <span
                      key={t.id}
                      className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-300"
                  >
                {t.url}
                    <button
                        onClick={() => handleRemoveTarget(t.id)}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Удалить"
                    >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
              ))}
            </div>
          </section>

          <section className="bg-zinc-950 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                время отклика ms
              </h2>
              <span className="font-mono text-[10px] text-zinc-600 uppercase">проверка в реальном времени</span>
            </div>

            <div className="h-[260px] w-full pt-2">
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                      <XAxis
                          dataKey="time"
                          stroke="#52525b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#27272a' }}
                          fontFamily="monospace"
                      />
                      <YAxis
                          stroke="#52525b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#27272a' }}
                          fontFamily="monospace"
                          unit="ms"
                      />
                      <Tooltip
                          contentStyle={{
                            backgroundColor: '#000000',
                            border: '1px solid #3f3f46',
                            borderRadius: '0px',
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                          }}
                          cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Line
                          type="linear"
                          dataKey="responseTime"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          dot={{ fill: '#000000', stroke: '#ffffff', strokeWidth: 1.5, r: 3 }}
                          activeDot={{ r: 5, fill: '#ffffff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex items-center justify-center font-mono text-xs text-zinc-600 uppercase tracking-wider">
                    прослушивание телеметрии
                  </div>
              )}
            </div>
          </section>

          <section className="bg-zinc-950 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                последние логи
              </h2>
              <span className="font-mono text-[10px] text-zinc-600 uppercase">буфер: {latestMetrics.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                <tr className="border-b border-zinc-900 text-zinc-600 uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Состояние</th>
                  <th className="py-2 px-3">Адрес</th>
                  <th className="py-2 px-3">Код</th>
                  <th className="py-2 px-3">Задержка</th>
                  <th className="py-2 px-3 text-right">Время</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                {latestMetrics.map((m, idx) => {
                  const isOk = m.statusCode >= 200 && m.statusCode < 400;
                  const rowKey = m.id || `${m.url}-${m.createdAt}-${idx}`;

                  return (
                      <tr key={rowKey} className="hover:bg-zinc-900/40 transition-colors group">
                        <td className="py-2.5 px-3">
                          {isOk ? (
                              <span className="inline-flex items-center gap-1.5 text-zinc-100 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> кайф
                          </span>
                          ) : (
                              <span className="inline-flex items-center gap-1.5 text-zinc-500 font-bold line-through">
                            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" /> ошибка
                          </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 font-medium group-hover:text-white transition-colors">
                        <span className="inline-flex items-center gap-1">
                          {m.url}
                          <ArrowUpRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        </td>
                        <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 border text-[10px] uppercase font-bold ${
                            isOk ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-black border-zinc-600 text-zinc-400'
                        }`}>
                          {m.statusCode || 'ошибка'}
                        </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">{m.responseTime}ms</td>
                        <td className="py-2.5 px-3 text-right text-zinc-600">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
  );
}