import { useEffect, useRef, useState } from 'react';
import { getAccountStatus, getReleaseStatus, getWorkspaceHealth } from '../utils/betaRuntime';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const PROMPT = 'operator@midnight:~$';

const TerminalApp = () => {
  const { data, session, searchWorkspace, updateWorkspaceData } = useWorkspaceData();
  const [history, setHistory] = useState([
    'OSA Midnight Console v2.0',
    'Type help for commands. This console never calls AI or remote services.',
    '',
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const buildResponse = (rawCommand) => {
    const [command = '', ...rest] = rawCommand.trim().split(/\s+/);
    const args = rest.join(' ');

    switch (command.toLowerCase()) {
      case '':
        return [];
      case 'help':
        return [
          'Commands: help, clear, whoami, date, stats, notes, recent, library, calendar, bookmarks, inventory, profiles, comms, lan, ports, flows, wallets, clocks, policy, apps, find, health, beta, release, backup, capture',
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
          `${releaseStatus.product} ${releaseStatus.version}`,
          `channel=${releaseStatus.channel}`,
          `runtime=${releaseStatus.runtime}`,
          ...releaseStatus.releaseNotes.map((note) => `- ${note}`),
        ];
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
      return;
    }

    setHistory((current) => [...current, ...response]);
  };

  return (
    <div className="flex h-full flex-col bg-black p-3 font-mono text-sm text-emerald-300">
      <div className="flex-1 space-y-1 overflow-y-auto">
        {history.map((line, index) => (
          <div key={`${line}-${index}`} className="whitespace-pre-wrap break-words">
            {line}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-emerald-500/20 pt-3">
        <span className="text-amber-300">{PROMPT}</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent text-emerald-200 outline-none placeholder:text-emerald-700"
          placeholder="Enter command..."
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalApp;
