import { useEffect, useState } from 'react';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const TYPES = ['software', 'operating system', 'methodology', 'hardware', 'service'];
const PLATFORMS = ['Cross-platform', 'macOS', 'Linux', 'Windows', 'Process', 'Cloud'];
const STATUSES = ['active', 'approved', 'standard', 'planned', 'retired'];

const EMPTY_FORM = {
  name: '',
  type: 'software',
  platform: 'Cross-platform',
  status: 'active',
  notes: '',
};

const InventoryApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState(data.inventory[0]?.id ?? null);

  useEffect(() => {
    if (!data.inventory.find((item) => item.id === selectedItemId)) {
      setSelectedItemId(data.inventory[0]?.id ?? null);
    }
  }, [data.inventory, selectedItemId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'inventory') {
      return;
    }

    if (session.navigation.itemId) {
      setFilter('all');
      setSelectedItemId(session.navigation.itemId);
      window.requestAnimationFrame(() => {
        document.getElementById(`inventory-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      });
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const items = data.inventory.filter((item) => (filter === 'all' ? true : item.platform === filter));

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const item = {
      id: createId('asset'),
      name: form.name.trim(),
      type: form.type,
      platform: form.platform,
      status: form.status,
      notes: form.notes.trim(),
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      inventory: [item, ...current.inventory],
    }));

    setForm(EMPTY_FORM);
    setSelectedItemId(item.id);
  };

  const removeItem = (itemId) => {
    updateWorkspaceData((current) => ({
      ...current,
      inventory: current.inventory.filter((item) => item.id !== itemId),
    }));
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="w-80 border-r border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Boxes size={18} className="text-amber-300" />
          Inventory
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Track approved tools, operating systems, methodologies, and supporting assets.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Name"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={form.platform}
              onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Why it matters, owner, caveats..."
            className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          />

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <Plus size={16} />
            Add item
          </button>
        </form>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', ...PLATFORMS].map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setFilter(platform)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === platform
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
            <table className="min-w-full divide-y divide-white/10 text-left">
              <thead className="bg-black/20 text-xs uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-200">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    id={`inventory-${item.id}`}
                    className={`cursor-pointer ${
                      selectedItemId === item.id ? 'bg-amber-500/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                    <td className="px-4 py-4">{item.type}</td>
                    <td className="px-4 py-4">{item.platform}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{item.notes}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InventoryApp;
