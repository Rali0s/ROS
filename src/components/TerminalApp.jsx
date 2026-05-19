import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import { getAccountStatus, getReleaseStatus, getWorkspaceHealth } from '../utils/betaRuntime';
import { formatBpsCommandResponse } from '../utils/bpsEngine';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const PROMPT = 'operator@bos-taurus:~$';

const splitTags = (value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const TerminalApp = () => {
  const { data, session, searchWorkspace, updateWorkspaceData, captureMemoryItem } = useWorkspaceData();
  const [history, setHistory] = useState([
    'ROS Command Memory Console :: Terminal v2 foundation',
    'Capture commands, outputs, and operational notes into project memory.',
    'Full host shell control is planned after appliance readiness.',
    '',
  ]);
  const [input, setInput] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureCommand, setCaptureCommand] = useState('');
  const [captureOutput, setCaptureOutput] = useState('');
  const [captureTags, setCaptureTags] = useState('terminal');
  const [captureSource, setCaptureSource] = useState('terminal://command-memory-console');
  const [captureStatus, setCaptureStatus] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const endRef = useRef(null);
  const activeProject =
    data.projects?.find((project) => project.id === data.activeProjectId) || data.projects?.[0] || null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [history]);

  const saveCommandMemory = ({ command, outputExcerpt, tags, sourcePath }) => {
    const trimmedCommand = command.trim();
    const trimmedOutput = outputExcerpt.trim();

    if (!trimmedCommand && !trimmedOutput) {
      setCaptureStatus('Add a command or output excerpt before saving.');
      return null;
    }

    const item = captureMemoryItem({
      projectId: activeProject?.id || data.activeProjectId,
      kind: 'command',
      title: trimmedCommand || 'Terminal output',
      command: trimmedCommand,
      outputExcerpt: trimmedOutput,
      body: trimmedOutput,
      sourcePath: sourcePath.trim(),
      tags: ['terminal', ...splitTags(tags)].filter((tag, index, list) => list.indexOf(tag) === index),
    });

    if (!item) {
      setCaptureStatus('Workspace is locked or unavailable. Command memory was not saved.');
      return null;
    }

    setCaptureStatus(`Saved command memory to ${activeProject?.name || 'active project'}.`);
    return item;
  };

  const handleManualCapture = () => {
    const item = saveCommandMemory({
      command: captureCommand,
      outputExcerpt: captureOutput,
      tags: captureTags,
      sourcePath: captureSource,
    });

    if (!item) {
      return;
    }

    setCaptureCommand('');
    setCaptureOutput('');
    setCaptureTags('terminal');
    setCaptureSource('terminal://command-memory-console');
  };

  const handleSaveLastOutput = () => {
    if (!lastResult?.command && !lastResult?.output?.length) {
      setCaptureStatus('Run a command before saving the last output.');
      return;
    }

    saveCommandMemory({
      command: lastResult.command,
      outputExcerpt: lastResult.output.join('\n'),
      tags: 'terminal,last-output',
      sourcePath: 'terminal://last-output',
    });
  };

  const buildResponse = (rawCommand) => {
    const [command = '', ...rest] = rawCommand.trim().split(/\s+/);
    const args = rest.join(' ');

    switch (command.toLowerCase()) {
      case '':
        return [];
      case 'help':
        return [
          'Terminal v2 scope: command memory console, not a full host shell.',
          'Commands: help, clear, whoami, date, stats, notes, recent, library, calendar, bookmarks, inventory, profiles, comms, lan, ports, flows, wallets, clocks, policy, apps, find, health, beta, release, backup, capture, bps.status, bps.log, bps.bias, bps.map, bps.replay, bps.alerts, bps.research, bps.export',
        ];
      case 'clear':
        setHistory([]);
        return null;
      case 'whoami':
        return [`${data.settings.operator} :: ${data.settings.codename}`];
      case 'date':
        return [new Date().toString()];
      case 'stats':
        return [
          `notes=${data.notes.length}`,
          `library=${data.library.length}`,
          `calendar=${data.calendarEvents.length}`,
          `bookmarks=${data.bookmarks.length}`,
          `inventory=${data.inventory.length}`,
          `profiles=${data.profiles.length}`,
          `bpsSubjects=${data.bpsSubjects.length}`,
          `bpsEntries=${data.bpsEntries.length}`,
          `comms=${data.comms.conversations.length}`,
          `flows=${data.flowBoards.length}`,
          `wallets=${data.wallets.length}`,
          `clocks=${data.clocks.length}`,
        ];
      case 'notes':
        return data.notes.map((note) => `- ${note.title} [${note.category}]`);
      case 'recent':
        return [...data.notes]
          .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
          .slice(0, 5)
          .map((note) => `- ${note.title} :: ${new Date(note.updatedAt).toLocaleString()}`);
      case 'bookmarks':
        return data.bookmarks.map((bookmark) => `- ${bookmark.title} :: ${bookmark.url}`);
      case 'library':
        return data.library.length
          ? data.library.map(
              (entry) =>
                `- ${entry.title} :: ${entry.format.toUpperCase()} :: ${(entry.authors.join(', ') || entry.publisher || entry.fileName)}`,
            )
          : ['No library items saved.'];
      case 'calendar':
        return data.calendarEvents.length
          ? [...data.calendarEvents]
              .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`))
              .map((event) => `- ${event.title} :: ${event.date}${event.time ? ` ${event.time}` : ''} :: ${event.category}`)
          : ['No calendar events saved.'];
      case 'inventory':
        return data.inventory.map(
          (item) => `- ${item.name} :: ${item.type} :: ${item.platform} :: ${item.status}`,
        );
      case 'profiles':
        return data.profiles.length
          ? data.profiles.map(
              (profile) =>
                `- ${profile.name} :: ${profile.emails.length} emails :: ${profile.pgpKeys.length} keys :: ${Object.values(profile.networkZones).filter(Boolean).length} zones`,
            )
          : ['No profile organizer entries saved.'];
      case 'comms':
        return data.comms.conversations.length
          ? data.comms.conversations.map(
              (conversation) =>
                `- ${conversation.title} :: ${conversation.peerDisplayName || conversation.peerKeyId} :: ${conversation.deliveryMode}`,
            )
          : ['No ROS comms conversations saved.'];
      case 'lan':
        return [
          `enabled=${data.lan?.enabled ? 'yes' : 'no'}`,
          `peers=${data.lan?.peers?.length || 0}`,
          `host=${data.lan?.identity?.hostname || 'pending'}`,
          `ip=${data.lan?.identity?.localIp || 'pending'}`,
          `status=${data.lan?.identity?.status || 'online'}`,
          `role=${data.lan?.identity?.role || 'peer'}`,
        ];
      case 'ports':
        return data.lan?.enabled
          ? [
              `scope=${data.lan?.security?.bindScope || 'LAN only'}`,
              ...(data.lan?.security?.openPorts || []).map((entry) => `- ${entry}`),
            ]
          : ['All F*Society LAN ports are closed.'];
      case 'flows':
        return data.flowBoards.length
          ? data.flowBoards.map(
              (board) =>
                `- ${board.title} :: ${board.nodes.length} nodes :: ${board.links.length} links`,
            )
          : ['No flow boards saved.'];
      case 'wallets':
        return data.wallets.length
          ? data.wallets.map(
              (wallet) =>
                `- ${wallet.label} :: ${wallet.network} :: ${wallet.addresses.length} addresses`,
            )
          : ['No wallet vault entries saved.'];
      case 'clocks':
      case 'tz':
        return data.clocks.map(
          (clock) =>
            `- ${clock.label} :: ${clock.timezone} :: ${new Intl.DateTimeFormat([], {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: clock.timezone,
            }).format(new Date())}`,
        );
      case 'policy':
        return [
          'Authorized use only.',
          'Record scope, contacts, evidence, and findings.',
          'Do not store offensive planning or unauthorized target data here.',
        ];
      case 'apps':
        return [
          '- Overview',
          '- BPS Engine',
          '- Library',
          '- Calendar',
          '- Vault Notes',
          '- Profile Organizer',
          '- ROS Comms',
          '- F*Society',
          '- Flow Studio',
          '- Bookmarks',
          '- Inventory',
          '- Wallet Vault',
          '- World Clocks',
          '- Midnight Console',
          '- Control Room',
        ];
      case 'find':
        if (!args) {
          return ['Usage: find <text>'];
        }
        return searchWorkspace(args)
          .flatMap((group) => group.results.map((result) => `- [${group.label}] ${result.title}`))
          .slice(0, 8);
      case 'health': {
        const health = getWorkspaceHealth({ data, session });
        return [
          `${health.summary}`,
          ...health.checks.slice(0, 4).map((check) => `- ${check.label}: ${check.detail}`),
        ];
      }
      case 'beta': {
        const accountStatus = getAccountStatus(data.settings);
        return [
          `channel=${getReleaseStatus(session).channel}`,
          `invite=${accountStatus.inviteCode || 'none'}`,
          `waitlist=${accountStatus.waitlistSource || 'waitlist'}`,
          `install=${accountStatus.installId}`,
        ];
      }
      case 'release': {
        const releaseStatus = getReleaseStatus(session);
        return [
          `${releaseStatus.product} ${releaseStatus.displayVersion}`,
          `channel=${releaseStatus.channel}`,
          `runtime=${releaseStatus.runtime}`,
          ...releaseStatus.releaseNotes.map((note) => `- ${note}`),
        ];
      }
      case 'bps.status':
      case 'bps.log':
      case 'bps.bias':
      case 'bps.map':
      case 'bps.replay':
      case 'bps.alerts':
      case 'bps.research':
      case 'bps.export': {
        const response = formatBpsCommandResponse(data, rawCommand);
        return response.length ? response : ['No BPS response generated.'];
      }
      case 'backup':
        return [
          `last-export=${data.settings.betaLastSnapshotExportAt || 'not-recorded'}`,
          `last-import=${data.settings.betaLastSnapshotImportAt || 'not-recorded'}`,
          `last-validation=${data.settings.betaLastBackupValidationAt || 'pending'}`,
        ];
      case 'capture':
      case 'quicknote':
        if (!args) {
          return ['Usage: capture <title>'];
        }
        updateWorkspaceData((current) => ({
          ...current,
          notes: [
            {
              id: createId('note'),
              title: args,
              category: 'briefing',
              tags: ['capture'],
              pinned: false,
              body: `# ${args}\n\n- Context:\n- Next step:\n- Follow-up:`,
              updatedAt: now(),
            },
            ...current.notes,
          ],
        }));
        return [`Captured quick note: ${args}`];
      default:
        return [`Command not found: ${command}`];
    }
  };

  const handleCommand = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    const rawCommand = input;
    setInput('');

    setHistory((current) => [...current, `${PROMPT} ${rawCommand}`]);

    const response = buildResponse(rawCommand);
    if (response === null) {
      return;
    }

    if (!response.length) {
      setHistory((current) => [...current, '']);
      setLastResult({ command: rawCommand, output: [], createdAt: now() });
      return;
    }

    setHistory((current) => [...current, ...response]);
    setLastResult({ command: rawCommand, output: response, createdAt: now() });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[rgba(7,12,14,0.84)] text-slate-100">
      <header className="shrink-0 border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
              Terminal v2
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">Command Memory Console</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
              Capture commands, outputs, and operational notes into project memory. Full host shell control is planned after appliance readiness.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{activeProject?.name || 'Active project'}</div>
            <div>Manual command memory active</div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
          <div className="h-full min-h-0 space-y-1 overflow-y-auto overscroll-contain p-3 font-mono text-sm leading-6 text-emerald-200">
            {history.map((line, index) => (
              <div key={`${line}-${index}`} className="min-w-0 whitespace-pre-wrap break-words">
                {line}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <section className="shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setCaptureOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/[0.045]"
          >
            <span>Command capture</span>
            {captureOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {captureOpen ? (
            <div className="grid gap-2 border-t border-white/10 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <input
                value={captureCommand}
                onChange={(event) => setCaptureCommand(event.target.value)}
                placeholder="Command"
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-100/30"
              />
              <input
                value={captureSource}
                onChange={(event) => setCaptureSource(event.target.value)}
                placeholder="source/path note"
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-100/30"
              />
              <textarea
                value={captureOutput}
                onChange={(event) => setCaptureOutput(event.target.value)}
                placeholder="Output excerpt or operational note"
                className="min-h-[5.5rem] min-w-0 resize-none rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-100/30 lg:col-span-2"
              />
              <input
                value={captureTags}
                onChange={(event) => setCaptureTags(event.target.value)}
                placeholder="tags"
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-100/30"
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveLastOutput}
                  disabled={!lastResult}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Save size={14} />
                  Save last output
                </button>
                <button
                  type="button"
                  onClick={handleManualCapture}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
                >
                  <Save size={14} />
                  Save capture
                </button>
              </div>
              {captureStatus ? (
                <div className="text-xs leading-5 text-slate-400 lg:col-span-2">{captureStatus}</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="shrink-0 rounded-2xl border border-emerald-500/20 bg-black/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 font-mono text-sm">
            <span className="shrink-0 text-amber-300">{PROMPT}</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleCommand}
              className="min-w-0 flex-1 bg-transparent text-emerald-100 outline-none placeholder:text-emerald-700"
              placeholder="Enter command..."
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalApp;
