'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Frame, Button, TextInput, SelectNative } from 'react95';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useIsMobile } from '../hooks/useIsMobile';

interface AdminProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type DocData = Record<string, unknown>;

const COLLECTIONS = [
  'minesweeper', 'albums', 'solitaire', 'sudoku',
  'museum_cameras', 'museum_computers', 'museum_consoles',
] as const;
type Collection = (typeof COLLECTIONS)[number];

const COLLECTION_OPTIONS = COLLECTIONS.map((col) => ({
  value: col,
  label: col === 'museum_cameras'   ? 'Museum: Cameras'
       : col === 'museum_computers' ? 'Museum: Computers'
       : col === 'museum_consoles'  ? 'Museum: Consoles'
       : col.charAt(0).toUpperCase() + col.slice(1),
}));

const MUSEUM_COLLECTIONS = new Set<Collection>(['museum_cameras', 'museum_computers', 'museum_consoles']);
const MUSEUM_DEFAULT_FIELDS = ['name', 'image', 'year', 'description'] as const;

// Fields shown read-only (not editable)
const READONLY_FIELDS = new Set(['id', 'createdAt', 'create_ts']);

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getColumns(docs: DocData[]): string[] {
  const keys = new Set<string>();
  docs.forEach((d) => Object.keys(d).forEach((k) => keys.add(k)));
  return ['id', ...Array.from(keys).filter((k) => k !== 'id')];
}

/** Coerce museum field types before writing to Firestore. */
function coerceMuseumFields(fields: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };
  if (typeof out.year === 'string' && out.year !== '') out.year = Number(out.year);
  return out;
}

export default function Admin({ windowId, focusWindow }: AdminProps) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeCollection, setActiveCollection] = useState<Collection>('minesweeper');
  const [docs, setDocs] = useState<DocData[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterText, setFilterText] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [editingDoc, setEditingDoc] = useState<DocData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  const login = async () => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setPassword('');
      } else {
        setLoginError('Invalid password.');
      }
    } catch {
      setLoginError('Connection error.');
    } finally {
      setLoggingIn(false);
    }
  };

  const fetchDocs = useCallback(async (col: Collection, tok: string) => {
    setLoading(true);
    setDocs([]);
    setEditingDoc(null);
    setIsAdding(false);
    setScrapeUrl('');
    setScrapeError('');
    setUploadError('');
    setFilterText('');
    setSortCol(null);
    setSortDir('asc');
    try {
      const res = await fetch(`/api/admin/${col}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) { setToken(null); return; }
      if (res.ok) {
        const data = await res.json();
        setDocs(data.docs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchDocs(activeCollection, token);
  }, [token, activeCollection, fetchDocs]);

  const deleteDoc = async (docId: string) => {
    if (!token || !window.confirm('Delete this document?')) return;
    const res = await fetch(`/api/admin/${activeCollection}/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { setToken(null); return; }
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    if (editingDoc?.id === docId) setEditingDoc(null);
  };

  const startAdd = () => {
    let defaultFields: string[];
    if (MUSEUM_COLLECTIONS.has(activeCollection)) {
      defaultFields = [...MUSEUM_DEFAULT_FIELDS];
    } else {
      const autoFields = activeCollection === 'albums' ? new Set([...READONLY_FIELDS, 'index']) : READONLY_FIELDS;
      defaultFields = getColumns(docs).filter((k) => !autoFields.has(k));
    }
    setEditFields(Object.fromEntries(defaultFields.map((k) => [k, ''])));
    setEditingDoc(null);
    setIsAdding(true);
    setScrapeUrl('');
    setScrapeError('');
    setUploadError('');
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(storage, `museum/${activeCollection}/${filename}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setEditFields((prev) => ({ ...prev, image: url }));
    } catch {
      setUploadError('Upload failed. Check Storage rules.');
    } finally {
      setUploading(false);
    }
  };

  const handleScrape = async () => {
    if (!token || !scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError('');
    try {
      const res = await fetch('/api/admin/albums/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      if (res.status === 401) { setToken(null); return; }
      const data = await res.json();
      if (!res.ok) { setScrapeError(data.error ?? 'Scrape failed.'); return; }
      setEditFields({
        url: data.url,
        title: data.title,
        thumb: data.thumb,
        links: JSON.stringify(data.links),
      });
    } catch {
      setScrapeError('Connection error.');
    } finally {
      setScraping(false);
    }
  };

  const saveAdd = async () => {
    if (!token) return;
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (activeCollection === 'albums') {
        body = { ...editFields, index: docs.length };
        if (typeof body.links === 'string') {
          try { body.links = JSON.parse(body.links as string); } catch { /* leave as-is */ }
        }
      } else if (MUSEUM_COLLECTIONS.has(activeCollection)) {
        body = coerceMuseumFields(editFields);
      } else {
        body = { ...editFields };
      }
      const res = await fetch(`/api/admin/${activeCollection}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { setToken(null); return; }
      if (res.ok) {
        const { id } = await res.json();
        setDocs((prev) => [...prev, { id, ...body }]);
        setIsAdding(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (docItem: DocData) => {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(docItem)) {
      if (READONLY_FIELDS.has(k)) continue;
      fields[k] = Array.isArray(v) ? JSON.stringify(v) : String(v ?? '');
    }
    setIsAdding(false);
    setEditingDoc(docItem);
    setEditFields(fields);
    setUploadError('');
  };

  const saveEdit = async () => {
    if (!token || !editingDoc) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = MUSEUM_COLLECTIONS.has(activeCollection)
        ? coerceMuseumFields(editFields)
        : { ...editFields };
      const res = await fetch(`/api/admin/${activeCollection}/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { setToken(null); return; }
      setDocs((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? { ...d, ...payload } : d))
      );
      setEditingDoc(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const displayedDocs = useMemo(() => {
    let result = docs;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter((doc) =>
        Object.values(doc).some((v) => formatCell(v).toLowerCase().includes(q))
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = formatCell(a[sortCol]);
        const bv = formatCell(b[sortCol]);
        const na = Number(av), nb = Number(bv);
        const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [docs, filterText, sortCol, sortDir]);

  const isMobile = useIsMobile();
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); focusWindow(windowId); };

  // Login screen
  if (!token) {
    return (
      <div className="app-content" onClick={stop}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Frame variant="well" style={{ padding: '20px', width: '260px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>Admin Login</div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>Password:</div>
          <TextInput
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') login(); }}
            fullWidth
            style={{ marginBottom: '10px' }}
            disabled={loggingIn}
          />
          {loginError && (
            <div style={{ color: 'red', fontSize: '11px', marginBottom: '8px' }}>{loginError}</div>
          )}
          <Button onClick={login} disabled={loggingIn || !password} fullWidth>
            {loggingIn ? 'Logging in...' : 'Login'}
          </Button>
        </Frame>
      </div>
    );
  }

  const columns = getColumns(docs);
  const isMuseum = MUSEUM_COLLECTIONS.has(activeCollection);

  return (
    <div className="app-content" onClick={stop}
      style={{ display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', height: '100%', boxSizing: 'border-box' }}>

      {/* Toolbar */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <SelectNative
            options={COLLECTION_OPTIONS}
            value={activeCollection}
            onChange={(opt: { value: string }) => setActiveCollection(opt.value as Collection)}
            width="100%"
          />
          <TextInput
            value={filterText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
            placeholder="Filter..."
            fullWidth
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button onClick={startAdd} disabled={loading} fullWidth>Add</Button>
            <Button onClick={() => fetchDocs(activeCollection, token)} disabled={loading} fullWidth>Refresh</Button>
            <Button onClick={() => setToken(null)} fullWidth>Logout</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <SelectNative
            options={COLLECTION_OPTIONS}
            value={activeCollection}
            onChange={(opt: { value: string }) => setActiveCollection(opt.value as Collection)}
            width="180px"
          />
          <TextInput
            value={filterText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
            placeholder="Filter..."
            style={{ flex: 1 }}
          />
          <Button onClick={startAdd} disabled={loading}>Add</Button>
          <Button onClick={() => fetchDocs(activeCollection, token)} disabled={loading}>Refresh</Button>
          <Button onClick={() => setToken(null)}>Logout</Button>
        </div>
      )}

      {/* Edit / Add Panel */}
      {(editingDoc || isAdding) && (
        <Frame variant="well" style={{ padding: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px' }}>
            {isAdding ? 'New Document' : `Editing: ${String(editingDoc!.id)}`}
          </div>

          {/* Albums: scrape helper */}
          {isAdding && activeCollection === 'albums' && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <TextInput
                  value={scrapeUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScrapeUrl(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleScrape(); }}
                  placeholder="Google Photos album URL..."
                  fullWidth
                  disabled={scraping}
                />
                <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}>
                  {scraping ? '...' : 'Scrape'}
                </Button>
              </div>
              {scrapeError && (
                <div style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>{scrapeError}</div>
              )}
            </div>
          )}

          {/* Hidden file input for museum image upload */}
          {isMuseum && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                // Reset so same file can be re-selected
                e.target.value = '';
              }}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', alignItems: 'center' }}>
            {Object.entries(editFields).map(([key, val]) => (
              <React.Fragment key={key}>
                <span style={{ fontSize: '11px' }}>{key}:</span>
                {key === 'image' && isMuseum ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <TextInput
                      value={val}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFields((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      fullWidth
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {uploading ? '...' : 'Upload'}
                    </Button>
                  </div>
                ) : (
                  <TextInput
                    value={val}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFields((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    fullWidth
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {uploadError && (
            <div style={{ color: 'red', fontSize: '11px', marginTop: '6px' }}>{uploadError}</div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            {isAdding
              ? <Button onClick={saveAdd} disabled={saving || uploading}>{saving ? 'Adding...' : 'Add'}</Button>
              : <Button onClick={saveEdit} disabled={saving || uploading}>{saving ? 'Saving...' : 'Save'}</Button>
            }
            <Button onClick={() => { setEditingDoc(null); setIsAdding(false); setUploadError(''); }}>Cancel</Button>
          </div>
        </Frame>
      )}

      {/* Document Table */}
      <Frame variant="field" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '12px', fontSize: '12px' }}>Loading...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: '12px', fontSize: '12px' }}>No documents found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#000080', color: '#ffffff' }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{
                      textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap',
                      cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    {col}{sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th style={{ padding: '4px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedDocs.map((docItem, i) => (
                <tr key={String(docItem.id)} style={{
                  background: editingDoc?.id === docItem.id
                    ? '#d0e4f7'
                    : i % 2 === 0 ? '#ffffff' : '#e8e4e0',
                }}>
                  {columns.map((col) => (
                    <td key={col} style={{
                      padding: '3px 8px', maxWidth: '200px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {formatCell(docItem[col])}
                    </td>
                  ))}
                  <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                    <Button onClick={() => startEdit(docItem)} style={{ fontSize: '10px', marginRight: '4px' }}>
                      Edit
                    </Button>
                    <Button onClick={() => deleteDoc(String(docItem.id))} style={{ fontSize: '10px' }}>
                      Del
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Frame>
    </div>
  );
}
