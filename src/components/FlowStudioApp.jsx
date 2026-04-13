import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Database,
  Download,
  Link2,
  Monitor,
  Plus,
  Printer,
  Server,
  Shield,
  Trash2,
  Workflow,
} from 'lucide-react';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const NODE_WIDTH = 176;
const NODE_HEIGHT = 84;

const NODE_TYPES = {
  workstation: {
    label: 'Workstation',
    icon: Monitor,
    tone: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  },
  gateway: {
    label: 'Gateway',
    icon: Shield,
    tone: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  },
  service: {
    label: 'Service',
    icon: Server,
    tone: 'border-violet-400/30 bg-violet-500/10 text-violet-100',
  },
  database: {
    label: 'Database',
    icon: Database,
    tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  },
  external: {
    label: 'External',
    icon: Cloud,
    tone: 'border-slate-400/30 bg-slate-500/10 text-slate-100',
  },
};

const FLOW_NODE_ORDER = Object.keys(NODE_TYPES);

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const createFlowNode = (type, index = 0) => ({
  id: createId('node'),
  type,
  label: `${NODE_TYPES[type].label} ${index + 1}`,
  x: 96 + (index % 3) * 240,
  y: 96 + Math.floor(index / 3) * 160,
  notes: '',
});

const createFlowBoard = () => ({
  id: createId('flow'),
  title: 'New Flow Board',
  description: 'Wireframe board for approved network or service flows.',
  nodes: [
    createFlowNode('workstation', 0),
    createFlowNode('gateway', 1),
    createFlowNode('service', 2),
  ],
  links: [],
  updatedAt: now(),
});

const getBoardBounds = (board) => {
  const width = Math.max(
    1280,
    ...board.nodes.map((node) => node.x + NODE_WIDTH + 80),
  );
  const height = Math.max(
    860,
    ...board.nodes.map((node) => node.y + NODE_HEIGHT + 120),
  );

  return { width, height };
};

const downloadTextFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const serializeBoardSvg = (board) => {
  const { width, height } = getBoardBounds(board);
  const linkMarkup = board.links
    .map((link) => {
      const from = board.nodes.find((node) => node.id === link.from);
      const to = board.nodes.find((node) => node.id === link.to);

      if (!from || !to) {
        return '';
      }

      const x1 = from.x + NODE_WIDTH / 2;
      const y1 = from.y + NODE_HEIGHT / 2;
      const x2 = to.x + NODE_WIDTH / 2;
      const y2 = to.y + NODE_HEIGHT / 2;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      return `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(226,232,240,0.75)" stroke-width="2" stroke-dasharray="6 4" />
        <rect x="${midX - 102}" y="${midY - 18}" width="204" height="36" rx="18" fill="rgba(2,6,23,0.92)" stroke="rgba(255,255,255,0.14)" />
        <text x="${midX}" y="${midY + 5}" fill="#e2e8f0" font-size="12" text-anchor="middle" font-family="Segoe UI, sans-serif">${escapeXml(link.label)}</text>
      `;
    })
    .join('');

  const nodeMarkup = board.nodes
    .map((node) => {
      const palette = NODE_TYPES[node.type];

      return `
        <rect x="${node.x}" y="${node.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="18" fill="rgba(2,6,23,0.9)" stroke="rgba(255,255,255,0.16)" />
        <rect x="${node.x + 16}" y="${node.y + 18}" width="34" height="34" rx="12" fill="rgba(99,102,241,0.14)" stroke="rgba(255,255,255,0.16)" />
        <text x="${node.x + 62}" y="${node.y + 32}" fill="#f8fafc" font-size="14" font-weight="600" font-family="Segoe UI, sans-serif">${escapeXml(node.label)}</text>
        <text x="${node.x + 62}" y="${node.y + 52}" fill="#94a3b8" font-size="11" letter-spacing="2" font-family="Segoe UI, sans-serif">${escapeXml(palette.label.toUpperCase())}</text>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#050816" />
          <stop offset="100%" stop-color="#09101f" />
        </linearGradient>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" fill="url(#grid)" />
      <rect x="32" y="28" width="${width - 64}" height="64" rx="20" fill="rgba(12,18,34,0.85)" stroke="rgba(255,255,255,0.12)" />
      <text x="64" y="62" fill="#f8fafc" font-size="28" font-weight="700" font-family="Segoe UI, sans-serif">${escapeXml(board.title)}</text>
      <text x="64" y="84" fill="#94a3b8" font-size="13" font-family="Segoe UI, sans-serif">${escapeXml(board.description || 'Wireframe flow export')}</text>
      ${linkMarkup}
      ${nodeMarkup}
    </svg>
  `.trim();
};

const FlowStudioApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [selectedBoardId, setSelectedBoardId] = useState(data.flowBoards[0]?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [linkSourceId, setLinkSourceId] = useState(null);
  const [status, setStatus] = useState('Select a node to edit it, or start link mode to connect two points.');
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data.flowBoards.find((board) => board.id === selectedBoardId)) {
      setSelectedBoardId(data.flowBoards[0]?.id ?? null);
      setSelectedNodeId(null);
      setSelectedLinkId(null);
      setLinkSourceId(null);
    }
  }, [data.flowBoards, selectedBoardId]);

  const selectedBoard =
    data.flowBoards.find((board) => board.id === selectedBoardId) ?? data.flowBoards[0] ?? null;
  const selectedNode =
    selectedBoard?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedLink =
    selectedBoard?.links.find((link) => link.id === selectedLinkId) ?? null;

  useEffect(() => {
    if (session.navigation?.appKey !== 'flow-studio') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedBoardId(session.navigation.itemId);
      setLinkSourceId(null);

      if (session.navigation.subItemType === 'node') {
        setSelectedNodeId(session.navigation.subItemId ?? null);
        setSelectedLinkId(null);
      } else if (session.navigation.subItemType === 'link') {
        setSelectedLinkId(session.navigation.subItemId ?? null);
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(null);
        setSelectedLinkId(null);
      }
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const updateBoard = (updater) => {
    if (!selectedBoard) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      flowBoards: current.flowBoards.map((board) => {
        if (board.id !== selectedBoard.id) {
          return board;
        }

        return {
          ...updater(board),
          updatedAt: now(),
        };
      }),
    }));
  };

  const createBoard = () => {
    const board = createFlowBoard();

    updateWorkspaceData((current) => ({
      ...current,
      flowBoards: [board, ...current.flowBoards],
    }));

    setSelectedBoardId(board.id);
    setSelectedNodeId(board.nodes[0]?.id ?? null);
    setSelectedLinkId(null);
    setLinkSourceId(null);
    setStatus('New board created.');
  };

  const deleteBoard = () => {
    if (!selectedBoard) {
      return;
    }

    const remainingBoards = data.flowBoards.filter((board) => board.id !== selectedBoard.id);

    updateWorkspaceData((current) => ({
      ...current,
      flowBoards: current.flowBoards.filter((board) => board.id !== selectedBoard.id),
    }));

    setSelectedBoardId(remainingBoards[0]?.id ?? null);
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setLinkSourceId(null);
    setStatus('Board removed.');
  };

  const addNode = (type) => {
    if (!selectedBoard) {
      return;
    }

    const typeCount = selectedBoard.nodes.filter((node) => node.type === type).length;
    const node = createFlowNode(type, selectedBoard.nodes.length + typeCount);

    updateBoard((board) => ({
      ...board,
      nodes: [...board.nodes, node],
    }));

    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setStatus(`${NODE_TYPES[type].label} node added.`);
  };

  const updateNode = (nodeId, patch) => {
    updateBoard((board) => ({
      ...board,
      nodes: board.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              ...patch,
            }
          : node,
      ),
    }));
  };

  const deleteNode = (nodeId) => {
    updateBoard((board) => ({
      ...board,
      nodes: board.nodes.filter((node) => node.id !== nodeId),
      links: board.links.filter((link) => link.from !== nodeId && link.to !== nodeId),
    }));

    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setLinkSourceId((current) => (current === nodeId ? null : current));
    setStatus('Node removed.');
  };

  const updateLink = (linkId, patch) => {
    updateBoard((board) => ({
      ...board,
      links: board.links.map((link) =>
        link.id === linkId
          ? {
              ...link,
              ...patch,
            }
          : link,
      ),
    }));
  };

  const deleteLink = (linkId) => {
    updateBoard((board) => ({
      ...board,
      links: board.links.filter((link) => link.id !== linkId),
    }));

    setSelectedLinkId(null);
    setStatus('Link removed.');
  };

  const startLinkMode = () => {
    if (!selectedNode) {
      return;
    }

    setLinkSourceId(selectedNode.id);
    setSelectedLinkId(null);
    setStatus(`Link mode started from ${selectedNode.label}. Click another node to connect it.`);
  };

  const handleNodeSelect = (nodeId) => {
    if (!selectedBoard) {
      return;
    }

    if (linkSourceId && linkSourceId !== nodeId) {
      const duplicate = selectedBoard.links.some(
        (link) =>
          (link.from === linkSourceId && link.to === nodeId) ||
          (link.from === nodeId && link.to === linkSourceId),
      );

      if (duplicate) {
        setLinkSourceId(null);
        setStatus('Those nodes are already linked.');
        return;
      }

      const sourceNode = selectedBoard.nodes.find((node) => node.id === linkSourceId);
      const targetNode = selectedBoard.nodes.find((node) => node.id === nodeId);
      const link = {
        id: createId('link'),
        from: linkSourceId,
        to: nodeId,
        label: `${sourceNode?.label ?? 'Source'} → ${targetNode?.label ?? 'Target'}`,
      };

      updateBoard((board) => ({
        ...board,
        links: [...board.links, link],
      }));

      setSelectedLinkId(link.id);
      setSelectedNodeId(null);
      setLinkSourceId(null);
      setStatus('Link created.');
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedLinkId(null);
  };

  const handleCanvasMouseMove = (event) => {
    if (!dragRef.current || !selectedBoard || !canvasRef.current) {
      return;
    }

    const bounds = canvasRef.current.getBoundingClientRect();
    const nextX = event.clientX - bounds.left - dragRef.current.offsetX;
    const nextY = event.clientY - bounds.top - dragRef.current.offsetY;

    updateNode(dragRef.current.nodeId, {
      x: Math.max(24, Math.min(nextX, bounds.width - NODE_WIDTH - 24)),
      y: Math.max(24, Math.min(nextY, bounds.height - NODE_HEIGHT - 24)),
    });
  };

  const handleCanvasMouseUp = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    const handleWindowMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  const svgLinks = useMemo(() => {
    if (!selectedBoard) {
      return [];
    }

    return selectedBoard.links
      .map((link) => {
        const from = selectedBoard.nodes.find((node) => node.id === link.from);
        const to = selectedBoard.nodes.find((node) => node.id === link.to);

        if (!from || !to) {
          return null;
        }

        const x1 = from.x + NODE_WIDTH / 2;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = to.x + NODE_WIDTH / 2;
        const y2 = to.y + NODE_HEIGHT / 2;

        return {
          ...link,
          x1,
          y1,
          x2,
          y2,
          midX: (x1 + x2) / 2,
          midY: (y1 + y2) / 2,
        };
      })
      .filter(Boolean);
  }, [selectedBoard]);

  const exportBoardJson = () => {
    if (!selectedBoard) {
      return;
    }

    downloadTextFile(
      JSON.stringify(selectedBoard, null, 2),
      `${selectedBoard.title.toLowerCase().replace(/\s+/g, '-') || 'flow-board'}.json`,
      'application/json',
    );
    setStatus('Board JSON saved to the host OS.');
  };

  const exportBoardPng = async () => {
    if (!selectedBoard) {
      return;
    }

    try {
      const { width, height } = getBoardBounds(selectedBoard);
      const svg = serializeBoardSvg(selectedBoard);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(url);
          setStatus('PNG export failed: no canvas context available.');
          return;
        }
        context.drawImage(image, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            URL.revokeObjectURL(url);
            setStatus('PNG export failed during encoding.');
            return;
          }
          const pngUrl = URL.createObjectURL(pngBlob);
          const anchor = document.createElement('a');
          anchor.href = pngUrl;
          anchor.download = `${selectedBoard.title.toLowerCase().replace(/\s+/g, '-') || 'flow-board'}.png`;
          anchor.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          setStatus('Board PNG exported to the host OS.');
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus('PNG export failed while rendering the board.');
      };
      image.src = url;
    } catch (error) {
      setStatus(error.message || 'PNG export failed.');
    }
  };

  const printBoard = () => {
    if (!selectedBoard) {
      return;
    }

    const svg = serializeBoardSvg(selectedBoard);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1440,height=980');

    if (!printWindow) {
      setStatus('Unable to open the print window. Check popup settings.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeXml(selectedBoard.title)}</title>
          <style>
            body { margin: 0; background: #020617; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            svg { max-width: 100%; height: auto; }
            @page { margin: 12mm; size: landscape; }
          </style>
        </head>
        <body>${svg}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
    setStatus('Print dialog opened. Use the host OS print dialog to save as PDF.');
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="w-72 border-r border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Workflow size={18} className="text-violet-300" />
          Flow Studio
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Wireframe boards for approved network paths, service maps, and architecture handoffs.
        </p>

        <button
          type="button"
          onClick={createBoard}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          <Plus size={16} />
          New board
        </button>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Boards</div>
          <div className="mt-3 space-y-2">
            {data.flowBoards.length ? (
              data.flowBoards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => {
                    setSelectedBoardId(board.id);
                    setSelectedNodeId(null);
                    setSelectedLinkId(null);
                    setLinkSourceId(null);
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedBoard?.id === board.id
                      ? 'border-violet-400/30 bg-violet-500/10'
                      : 'border-white/5 bg-black/15 hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="font-medium text-white">{board.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{board.nodes.length} nodes</div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-500">
                No boards yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Stencil</div>
          <div className="mt-3 grid gap-2">
            {FLOW_NODE_ORDER.map((type) => {
              const Icon = NODE_TYPES[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addNode(type)}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/15 px-3 py-3 text-left transition hover:border-violet-400/20 hover:bg-white/5"
                >
                  <span className={`inline-flex rounded-xl border p-2 ${NODE_TYPES[type].tone}`}>
                    <Icon size={16} />
                  </span>
                  <span className="text-sm text-slate-200">{NODE_TYPES[type].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/15 p-4">
          <div className="text-sm font-semibold text-violet-300">Status</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{status}</p>
        </div>
      </aside>

      <section className="grid min-w-0 flex-1 grid-cols-[1fr_340px]">
        <div className="min-w-0 border-r border-white/10 bg-slate-950/80">
          {selectedBoard ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Active board</div>
                  <div className="text-lg font-semibold text-white">{selectedBoard.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportBoardJson}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                  >
                    <Download size={16} />
                    Save file
                  </button>
                  <button
                    type="button"
                    onClick={exportBoardPng}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2 text-sm text-violet-100 transition hover:bg-violet-500/20"
                  >
                    <Download size={16} />
                    Export PNG
                  </button>
                  <button
                    type="button"
                    onClick={printBoard}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
                  >
                    <Printer size={16} />
                    Print / PDF
                  </button>
                  {linkSourceId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLinkSourceId(null);
                        setStatus('Link mode cancelled.');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                    >
                      Cancel Link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={deleteBoard}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    Delete board
                  </button>
                </div>
              </div>

              <div
                ref={canvasRef}
                className="relative h-[calc(100%-69px)] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),_transparent_22%),linear-gradient(rgba(255,255,255,0.04)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.04)_1px,_transparent_1px)] bg-[size:auto,28px_28px,28px_28px]"
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  {svgLinks.map((link) => (
                    <g key={link.id}>
                      <line
                        x1={link.x1}
                        y1={link.y1}
                        x2={link.x2}
                        y2={link.y2}
                        stroke={selectedLink?.id === link.id ? '#a78bfa' : 'rgba(226,232,240,0.7)'}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <foreignObject x={link.midX - 90} y={link.midY - 18} width="180" height="36">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLinkId(link.id);
                            setSelectedNodeId(null);
                          }}
                          className="pointer-events-auto flex h-9 w-full items-center justify-center rounded-full border border-white/10 bg-slate-950/85 px-3 text-xs text-slate-200"
                        >
                          {link.label}
                        </button>
                      </foreignObject>
                    </g>
                  ))}
                </svg>

                {selectedBoard.nodes.map((node) => {
                  const Icon = NODE_TYPES[node.type].icon;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleNodeSelect(node.id)}
                      onMouseDown={(event) => {
                        if (!canvasRef.current) {
                          return;
                        }

                        const bounds = event.currentTarget.getBoundingClientRect();
                        dragRef.current = {
                          nodeId: node.id,
                          offsetX: event.clientX - bounds.left,
                          offsetY: event.clientY - bounds.top,
                        };
                      }}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${NODE_WIDTH}px`,
                        height: `${NODE_HEIGHT}px`,
                      }}
                      className={`absolute rounded-2xl border px-4 py-3 text-left shadow-2xl shadow-black/20 transition ${
                        selectedNode?.id === node.id
                          ? 'border-violet-300/50 bg-violet-500/15'
                          : 'border-white/10 bg-slate-950/85 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-xl border p-2 ${NODE_TYPES[node.type].tone}`}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{node.label}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            {NODE_TYPES[node.type].label}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              Create a flow board to begin mapping.
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto bg-slate-900/80 p-5">
          {selectedBoard ? (
            <div className="space-y-5">
              {!selectedNode && !selectedLink ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Board details</div>
                    <input
                      value={selectedBoard.title}
                      onChange={(event) =>
                        updateBoard((board) => ({
                          ...board,
                          title: event.target.value,
                        }))
                      }
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none transition focus:border-violet-400/40"
                    />
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Description</div>
                    <textarea
                      value={selectedBoard.description}
                      onChange={(event) =>
                        updateBoard((board) => ({
                          ...board,
                          description: event.target.value,
                        }))
                      }
                      className="mt-3 h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-violet-400/40"
                    />
                  </div>
                </div>
              ) : null}

              {selectedNode ? (
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Node inspector</div>
                  <input
                    value={selectedNode.label}
                    onChange={(event) => updateNode(selectedNode.id, { label: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none transition focus:border-violet-400/40"
                  />
                  <select
                    value={selectedNode.type}
                    onChange={(event) => updateNode(selectedNode.id, { type: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-slate-100 outline-none transition focus:border-violet-400/40"
                  >
                    {FLOW_NODE_ORDER.map((type) => (
                      <option key={type} value={type}>
                        {NODE_TYPES[type].label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={selectedNode.notes}
                    onChange={(event) => updateNode(selectedNode.id, { notes: event.target.value })}
                    className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-violet-400/40"
                    placeholder="Notes about purpose, ownership, or constraints"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startLinkMode}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
                    >
                      <Link2 size={16} />
                      Start link
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNode(selectedNode.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                      Delete node
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedLink ? (
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Link inspector</div>
                  <input
                    value={selectedLink.label}
                    onChange={(event) => updateLink(selectedLink.id, { label: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none transition focus:border-violet-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => deleteLink(selectedLink.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    Delete link
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No board selected.</div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default FlowStudioApp;
