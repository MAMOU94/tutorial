import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Search, X, Loader2, PlugZap, Check, ChevronDown, GripVertical } from 'lucide-react';

const tableLabel = (table) => [table.catalog, table.schema, table.table].filter(Boolean).join('.');
const databaseSystems = {
  mysql: { label: 'MySQL', driver: 'MySQL ODBC 8.0 Unicode Driver' },
  mariadb: { label: 'MariaDB', driver: 'MariaDB ODBC 3.1 Driver' },
  postgresql: { label: 'PostgreSQL', driver: 'PostgreSQL Unicode' },
  sqlserver: { label: 'SQL Server', driver: 'ODBC Driver 18 for SQL Server' },
  other: { label: 'Other ODBC database', driver: '' }
};
const inputClass = 'w-full rounded-md border border-[#303034] bg-[#090909] px-3 py-2 text-xs text-[#e4e4e7] placeholder:text-[#71717a] outline-none focus:border-[#71717a] focus:ring-1 focus:ring-[#3f3f46] disabled:opacity-50 [color-scheme:dark]';
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#c4c4c8]';
const odbcValue = (input) => `{${String(input).replaceAll('}', '}}') + '}'}`;

const resolveDatabaseDriver = (system, installedDrivers) => {
  const drivers = Array.isArray(installedDrivers) ? installedDrivers : [];
  const patterns = {
    mysql: [/^mysql.*unicode/i, /^mysql/i, /^maria.*unicode/i, /^maria/i],
    mariadb: [/^maria.*unicode/i, /^maria/i, /^mysql.*unicode/i, /^mysql/i],
    postgresql: [/^postgresql.*unicode/i, /^postgresql/i],
    sqlserver: [/^odbc driver .* for sql server$/i, /^sql server/i]
  }[system] || [];
  for (const pattern of patterns) {
    const match = drivers.find((driverName) => pattern.test(driverName));
    if (match) return match;
  }
  return databaseSystems[system]?.driver || '';
};

function DatabaseSystemSelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const options = Object.entries(databaseSystems);
  const selectedIndex = Math.max(0, options.findIndex(([key]) => key === value));

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);

  const selectOption = (index) => {
    const [key] = options[index];
    onChange(key);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (isOpen
        ? (current + delta + options.length) % options.length
        : (selectedIndex + delta + options.length) % options.length));
      setIsOpen(true);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
      setIsOpen(true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (isOpen) {
        event.preventDefault();
        selectOption(activeIndex);
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Database type"
        onClick={() => { setActiveIndex(selectedIndex); setIsOpen((current) => !current); }}
        onKeyDown={handleKeyDown}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span>{databaseSystems[value]?.label || databaseSystems.other.label}</span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-[#a1a1aa]" />
      </button>
      {isOpen && (
        <div role="listbox" aria-label="Database type options" onKeyDown={handleKeyDown} className="absolute left-0 right-0 top-full z-[180] mt-1 max-h-48 overflow-y-auto rounded-md border border-[#3a3a3a] bg-[#171717] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
          {options.map(([key, option], index) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={value === key}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => selectOption(index)}
              className={`block min-h-8 w-full rounded px-2.5 py-1.5 text-left text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#a1a1aa] ${activeIndex === index ? 'bg-[#292929] text-[#f4f4f5]' : 'text-[#d4d4d8] hover:bg-[#252525]'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplyDatabaseEditsButton({ source, rows, columns, onCommit }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const applyEdits = async () => {
    if (!source || busy) return;
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      const result = await window.electronAPI?.applyDatabaseCellEdits?.({
        target: { ...source.target, connectionId: source.connectionId },
        originalRows: source.originalRows,
        rows,
        columns: source.databaseColumns || columns,
        primaryKeys: source.primaryKeys
      });
      if (!result?.success) throw new Error(result?.error || 'Database changes could not be applied.');
      onCommit?.(rows);
      setMessage(`${result.updated} row(s) saved.`);
    } catch (err) {
      setHasError(true);
      setMessage(err?.message || 'Database changes could not be applied.');
    } finally {
      setBusy(false);
    }
  };

  if (!source) return null;
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={busy} onClick={applyEdits} className="inline-flex items-center rounded-md border border-[#303034] bg-[#171717] px-2.5 py-1.5 text-[11px] text-[#d4d4d8] hover:bg-[#252525] disabled:opacity-50" title="Apply cell edits to the connected database">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        <span className="ml-1">{busy ? 'Applying…' : 'Apply DB edits'}</span>
      </button>
      {message && <span role="status" className={`max-w-48 truncate text-[10px] ${hasError ? 'text-[#e5a4a4]' : 'text-[#a1a1aa]'}`} title={message}>{message}</span>}
    </div>
  );
}

export default function DatabaseConnectionPanel({
  onLoadTable,
  datasetName = '',
  rows,
  columns,
  isOpen,
  onOpenChange
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = typeof isOpen === 'boolean' ? isOpen : localOpen;
  const setOpen = (nextOpen) => {
    if (typeof onOpenChange === 'function') onOpenChange(nextOpen);
    else setLocalOpen(nextOpen);
  };
  const [connectionMode, setConnectionMode] = useState('driver');
  const [system, setSystem] = useState('mysql');
  const [driver, setDriver] = useState(databaseSystems.mysql.driver);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [dsn, setDsn] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [extraOptions, setExtraOptions] = useState('');
  const [destinationTable, setDestinationTable] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [panelPosition, setPanelPosition] = useState({ x: 56, y: 48 });
  const panelRef = useRef(null);
  const dragOffsetRef = useRef(null);
  const dragFrameRef = useRef(0);
  const pendingPositionRef = useRef(null);
  const dragCleanupRef = useRef(null);
  const filteredTables = useMemo(() => tables.filter((table) => tableLabel(table).toLowerCase().includes(search.toLowerCase())), [tables, search]);
  const suggestedTableName = useMemo(() => String(datasetName || '')
    .split(/[\\/]/).pop()
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^[^A-Za-z_]+/, '_')
    .slice(0, 63), [datasetName]);
  const connectionString = useMemo(() => {
    const attributes = connectionMode === 'dsn'
      ? [`DSN=${odbcValue(dsn)}`]
      : [
        `DRIVER=${odbcValue(driver)}`,
        host.trim() ? `SERVER=${odbcValue(host.trim())}` : '',
        port.trim() ? `PORT=${odbcValue(port.trim())}` : '',
        database.trim() ? `DATABASE=${odbcValue(database.trim())}` : ''
      ];
    const extras = extraOptions.split(';').map((item) => item.trim()).filter(Boolean);
    if (username.trim()) attributes.push(`UID=${odbcValue(username.trim())}`);
    attributes.push(`PWD=${odbcValue(password)}`);
    return [...attributes.filter(Boolean), ...extras].join(';');
  }, [connectionMode, database, driver, dsn, extraOptions, host, password, port, username]);

  useEffect(() => {
    if (open && !destinationTable) setDestinationTable(suggestedTableName || 'dataset_data');
  }, [destinationTable, open, suggestedTableName]);

  useEffect(() => {
    let cancelled = false;
    const listDrivers = window.electronAPI?.listDatabaseDrivers;
    if (typeof listDrivers !== 'function') return undefined;
    Promise.resolve(listDrivers()).then((result) => {
      if (cancelled || !result?.success) return;
      const installedDrivers = Array.isArray(result.drivers) ? result.drivers : [];
      setAvailableDrivers(installedDrivers);
      setDriver((current) => {
        const isPreset = Object.values(databaseSystems).some((option) => option.driver === current);
        return isPreset ? resolveDatabaseDriver(system, installedDrivers) : current;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [system]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => () => {
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current);
    if (typeof dragCleanupRef.current === 'function') dragCleanupRef.current();
  }, []);

  const startPanelDrag = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button, input, select, textarea')) return;
    const panelNode = panelRef.current;
    const bounds = panelNode?.getBoundingClientRect();
    if (!panelNode || !bounds) return;
    const coordinateLayer = panelNode.parentElement?.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      originX: coordinateLayer?.left || 0,
      originY: coordinateLayer?.top || 0
    };
    panelNode.dataset.dragging = 'true';
    panelNode.style.transition = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handlePointerMove = (moveEvent) => {
      const dragOffset = dragOffsetRef.current;
      const activePanel = panelRef.current;
      if (!dragOffset || !activePanel) return;
      moveEvent.preventDefault();
      const panelBounds = activePanel.getBoundingClientRect();
      const maxX = Math.max(0, window.innerWidth - dragOffset.originX - panelBounds.width);
      const maxY = Math.max(0, window.innerHeight - dragOffset.originY - 72);
      pendingPositionRef.current = {
        x: Math.min(maxX, Math.max(0, moveEvent.clientX - dragOffset.originX - dragOffset.x)),
        y: Math.min(maxY, Math.max(0, moveEvent.clientY - dragOffset.originY - dragOffset.y))
      };
      if (dragFrameRef.current) return;
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = 0;
        const position = pendingPositionRef.current;
        if (position && panelRef.current) {
          panelRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        }
      });
    };

    const handlePointerUp = () => {
      const position = pendingPositionRef.current;
      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = 0;
      }
      if (position && panelRef.current) {
        panelRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        setPanelPosition(position);
        pendingPositionRef.current = null;
      }
      if (panelRef.current) {
        panelRef.current.dataset.dragging = 'false';
        panelRef.current.style.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)';
      }
      dragOffsetRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      dragCleanupRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    dragCleanupRef.current = handlePointerUp;
    event.preventDefault();
  };

  const connect = async (event) => {
    event.preventDefault();
    if (connectionMode === 'driver' && !driver.trim()) {
      setError('Enter the exact name of an installed ODBC driver.');
      return;
    }
    if (connectionMode === 'dsn' && !dsn.trim()) {
      setError('Enter a configured data source name.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await window.electronAPI?.connectDatabase?.(connectionString, system);
      if (!result?.success) throw new Error(result?.error || 'Could not connect.');
      setConnectionId(result.connectionId);
      const response = await window.electronAPI.listDatabaseTables(result.connectionId);
      if (!response?.success) throw new Error(response?.error || 'Connected, but could not list tables.');
      setConnected(true);
      setTables(response.tables || []);
      setNotice(`${response.tables?.length || 0} tables and views found.`);
    } catch (err) {
      setError(err?.message || 'Could not connect to the database.');
    } finally {
      setBusy(false);
    }
  };

  const loadTable = async () => {
    if (!selectedTable) return;
    setBusy(true);
    setError('');
    try {
      const result = await window.electronAPI?.readDatabaseTable?.({ ...selectedTable, connectionId });
      if (!result?.success) throw new Error(result?.error || 'Could not read this table.');
      const loaded = await onLoadTable?.({
        target: selectedTable,
        connectionId,
        name: tableLabel(selectedTable),
        columns: result.columns || [],
        rows: result.rows || [],
        primaryKeys: result.primaryKeys || [],
        truncated: Boolean(result.truncated)
      });
      if (loaded !== false) {
        setNotice(`Loaded ${result.rows?.length || 0} rows${result.truncated ? ' (first 10,000 only)' : ''}.`);
        setOpen(false);
      }
    } catch (err) {
      setError(err?.message || 'Could not read this table.');
    } finally {
      setBusy(false);
    }
  };

  const saveDataset = async () => {
    if (!connected || !rows?.length || !columns?.length) return;
    const tableName = destinationTable.trim();
    if (!window.confirm(`Save ${rows.length} rows as a new database table named "${tableName}"? A row ID will be added. Existing tables will not be changed.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await window.electronAPI?.saveDatasetToDatabase?.({
        connectionId,
        tableName,
        columns,
        rows
      });
      if (!result?.success) throw new Error(result?.error || 'Could not save this dataset.');
      try {
        const refreshed = await window.electronAPI.listDatabaseTables(connectionId);
        if (refreshed?.success) setTables(refreshed.tables || []);
      } catch (_) { }
      setDestinationTable('');
      setNotice(`Saved ${result.inserted} rows to ${result.tableName}; added ${result.primaryKey} for row matching.`);
    } catch (err) {
      setError(err?.message || 'Could not save this dataset.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await window.electronAPI?.disconnectDatabase?.();
    } finally {
      setConnected(false);
      setTables([]);
      setSelectedTable(null);
      setConnectionId('');
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <div className="pointer-events-none fixed inset-0 z-[150]">
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="database-connect-title"
            style={{ left: 0, top: 0, transform: `translate3d(${panelPosition.x}px, ${panelPosition.y}px, 0)`, transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            className="pointer-events-auto fixed left-0 top-0 flex max-h-[calc(100vh-3rem)] w-[min(64rem,calc(100vw-4rem))] flex-col overflow-hidden rounded-lg border border-[#292929] bg-[#101010] text-[#e4e4e7] shadow-[0_20px_60px_rgba(0,0,0,0.75)] will-change-transform"
            data-dragging="false"
          >
            <header
              onPointerDown={startPanelDrag}
              className="flex cursor-move touch-none select-none items-center justify-between border-b border-[#292929] px-5 py-4"
            >
              <div className="flex items-center gap-2"><GripVertical size={14} aria-hidden="true" className="text-[#71717a]" /><Database size={17} className="text-[#a1a1aa]" /><div><h2 id="database-connect-title" className="text-sm font-medium">Connect to a database</h2><p className="mt-1 text-xs text-[#a1a1aa]">Enter the connection details, then choose a table to load.</p></div></div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#252525] hover:text-[#e4e4e7]"><X size={16} /></button>
            </header>
            <div className="grid min-h-0 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.05fr_0.95fr]">
              <form onSubmit={connect} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-md border border-[#292929] bg-[#0d0d0d] p-1.5">
                  <button type="button" disabled={connected || busy} onClick={() => setConnectionMode('driver')} aria-pressed={connectionMode === 'driver'} className={`rounded px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a1a1aa] disabled:opacity-50 ${connectionMode === 'driver' ? 'bg-[#252525] text-[#e4e4e7]' : 'text-[#a1a1aa] hover:text-[#e4e4e7]'}`}>Driver details</button>
                  <button type="button" disabled={connected || busy} onClick={() => setConnectionMode('dsn')} aria-pressed={connectionMode === 'dsn'} className={`rounded px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a1a1aa] disabled:opacity-50 ${connectionMode === 'dsn' ? 'bg-[#252525] text-[#e4e4e7]' : 'text-[#a1a1aa] hover:text-[#e4e4e7]'}`}>Saved DSN</button>
                </div>
                {connectionMode === 'driver' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block"><span className={labelClass}>Database type</span><DatabaseSystemSelect value={system} disabled={connected || busy} onChange={(nextSystem) => { setSystem(nextSystem); setDriver(resolveDatabaseDriver(nextSystem, availableDrivers)); }} /></label>
                      <label className="block"><span className={labelClass}>ODBC driver</span><input value={driver} disabled={connected || busy} onChange={(event) => setDriver(event.target.value)} autoComplete="off" placeholder="Exact installed driver name" className={inputClass} /></label>
                    </div>
                    <div className="grid grid-cols-[1fr_112px] gap-3">
                      <label className="block"><span className={labelClass}>Host</span><input value={host} disabled={connected || busy} onChange={(event) => setHost(event.target.value)} autoComplete="off" placeholder="localhost or server address" className={inputClass} /></label>
                      <label className="block"><span className={labelClass}>Port</span><input value={port} disabled={connected || busy} onChange={(event) => setPort(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="Optional" className={inputClass} /></label>
                    </div>
                    <label className="block"><span className={labelClass}>Database or catalog</span><input value={database} disabled={connected || busy} onChange={(event) => setDatabase(event.target.value)} autoComplete="off" placeholder="Database name" className={inputClass} /></label>
                  </>
                ) : (
                  <div className="space-y-3">
                    <label className="block"><span className={labelClass}>Database type</span><DatabaseSystemSelect value={system} disabled={connected || busy} onChange={setSystem} /></label>
                    <label className="block"><span className={labelClass}>Data source name (DSN)</span><input value={dsn} disabled={connected || busy} onChange={(event) => setDsn(event.target.value)} autoComplete="off" placeholder="Configured ODBC data source" className={inputClass} /></label>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className={labelClass}>Username</span><input value={username} disabled={connected || busy} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Database user" className={inputClass} /></label>
                  <label className="block"><span className={labelClass}>Password</span><input type="password" value={password} disabled={connected || busy} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Database password" className={inputClass} /></label>
                </div>
                <label className="block"><span className={labelClass}>Additional ODBC options <span className="font-normal text-[#77827e]">(optional)</span></span><input value={extraOptions} disabled={connected || busy} onChange={(event) => setExtraOptions(event.target.value)} autoComplete="off" placeholder="For example: Encrypt=yes" className={inputClass} /></label>
                <p className="text-[11px] leading-relaxed text-[#a1a1aa]">Passwords stay in memory for this app session. Install the matching ODBC driver on this computer.</p>
                <div className="flex gap-2">
                  {!connected ? (
                    <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-[#292929] px-4 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#3a3a3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a1a1aa] disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}Connect</button>
                  ) : (
                    <button type="button" disabled={busy} onClick={disconnect} className="rounded-md border border-[#303034] px-4 py-2.5 text-xs text-[#d4d4d8] hover:bg-[#252525]">Disconnect</button>
                  )}
                </div>
                {connected && (
                  <section className="space-y-3 rounded-md border border-[#292929] bg-[#0d0d0d] p-3.5">
                    <div>
                      <h3 className="text-xs font-medium text-[#e4e4e7]">Save current dataset</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#a1a1aa]">Creates a new table with {rows?.length || 0} rows and a generated row ID. Existing tables are never replaced.</p>
                    </div>
                    <label className="block"><span className={labelClass}>New table name</span><input value={destinationTable} onChange={(event) => setDestinationTable(event.target.value)} disabled={busy} autoComplete="off" placeholder="for example, experiment_data" className={inputClass} /></label>
                    <button type="button" disabled={busy || !rows?.length || !columns?.length || !destinationTable.trim()} onClick={saveDataset} className="inline-flex items-center gap-2 rounded-md bg-[#292929] px-3 py-2 text-xs font-medium text-[#f4f4f5] hover:bg-[#3a3a3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a1a1aa] disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}Save dataset to database</button>
                  </section>
                )}
              </form>
              <div className="flex min-h-[300px] flex-col overflow-hidden rounded-md border border-[#292929] bg-[#0d0d0d]">
                <div className="border-b border-[#292929] p-3.5">
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-medium text-[#e4e4e7]">Tables and views</h3><span className="text-[11px] tabular-nums text-[#a1a1aa]">{tables.length}</span></div>
                  <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-[#71717a]" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search tables" placeholder="Search by name or schema" disabled={!connected} className={`${inputClass} pl-9`} /></div>
                </div>
                <div className="min-h-[180px] flex-1 overflow-y-auto p-2.5">
                  {!connected ? <p className="p-3 text-xs text-[#a1a1aa]">Connect to browse available tables.</p> : filteredTables.length === 0 ? <p className="p-3 text-xs text-[#a1a1aa]">No matching tables.</p> : filteredTables.map((table, index) => (
                    <button key={`${table.catalog}:${table.schema}:${table.table}:${index}`} type="button" onClick={() => setSelectedTable(table)} aria-pressed={selectedTable === table} className={`mb-1 flex min-h-9 w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a1a1aa] ${selectedTable === table ? 'bg-[#292929] text-[#f4f4f5]' : 'text-[#d4d4d8] hover:bg-[#1f1f1f]'}`}>
                      <span className="min-w-0 truncate">{tableLabel(table)}</span><span className="ml-3 shrink-0 text-[10px] text-[#a1a1aa]">{table.type}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#292929] p-3"><button type="button" disabled={busy || !selectedTable} onClick={loadTable} className="w-full rounded-md bg-[#292929] px-3 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#3a3a3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a1a1aa] disabled:opacity-50">{busy ? 'Working…' : 'Load selected table'}</button></div>
              </div>
            </div>
            <footer aria-live="polite" className="min-h-10 border-t border-[#292929] px-5 py-2.5 text-xs">
              {error ? <p className="text-[#e5a4a4]">{error}</p> : notice ? <p className="text-[#d4d4d8]">{notice}</p> : <p className="text-[#a1a1aa]">Table contents stay read-only until you load one into Data Explorer.</p>}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
