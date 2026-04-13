'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Frame, Button, TextInput } from 'react95';

interface AdminProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type DocData = Record<string, unknown>;

const COLLECTIONS = ['minesweeper', 'albums', 'solitaire', 'sudoku'] as const;
type Collection = (typeof COLLECTIONS)[number];

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

export default function Admin({ windowId, focusWindow }: AdminProps) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeCollection, setActiveCollection] = useState<Collection>('minesweeper');
  const [docs, setDocs] = useState<DocData[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingDoc, setEditingDoc] = useState<DocData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

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
    const autoFields = activeCollection === 'albums' ? new Set([...READONLY_FIELDS, 'index']) : READONLY_FIELDS;
    const editableColumns = getColumns(docs).filter((k) => !autoFields.has(k));
    setEditFields(Object.fromEntries(editableColumns.map((k) => [k, ''])));
    setEditingDoc(null);
    setIsAdding(true);
    setScrapeUrl('');
    setScrapeError('');
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
      const body: Record<string, unknown> = activeCollection === 'albums'
        ? { ...editFields, index: docs.length }
        : { ...editFields };
      if (activeCollection === 'albums' && typeof body.links === 'string') {
        try { body.links = JSON.parse(body.links as string); } catch { /* leave as-is */ }
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
  };

  const saveEdit = async () => {
    if (!token || !editingDoc) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/${activeCollection}/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      if (res.status === 401) { setToken(null); return; }
      setDocs((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? { ...d, ...editFields } : d))
      );
      setEditingDoc(null);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="app-content" onClick={stop}
      style={{ display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', height: '100%', boxSizing: 'border-box' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {COLLECTIONS.map((col) => (
          <Button
            key={col}
            onClick={() => setActiveCollection(col)}
            style={{ fontWeight: activeCollection === col ? 'bold' : 'normal' }}
          >
            {col}
          </Button>
        ))}
        <Button onClick={startAdd} disabled={loading} style={{ marginLeft: 'auto' }}>
          Add
        </Button>
        <Button onClick={() => fetchDocs(activeCollection, token)} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={() => setToken(null)}>Logout</Button>
      </div>

      {/* Edit / Add Panel */}
      {(editingDoc || isAdding) && (
        <Frame variant="well" style={{ padding: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px' }}>
            {isAdding ? 'New Document' : `Editing: ${String(editingDoc!.id)}`}
          </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', alignItems: 'center' }}>
            {Object.entries(editFields).map(([key, val]) => (
              <React.Fragment key={key}>
                <span style={{ fontSize: '11px' }}>{key}:</span>
                <TextInput
                  value={val}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFields((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  fullWidth
                />
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            {isAdding
              ? <Button onClick={saveAdd} disabled={saving}>{saving ? 'Adding...' : 'Add'}</Button>
              : <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            }
            <Button onClick={() => { setEditingDoc(null); setIsAdding(false); }}>Cancel</Button>
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
              <tr>
                {columns.map((col) => (
                  <th key={col} style={{
                    textAlign: 'left', padding: '4px 8px',
                    borderBottom: '1px solid #808080', whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
                <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #808080' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {docs.map((docItem, i) => (
                <tr key={String(docItem.id)}
                  style={{ background: editingDoc?.id === docItem.id ? '#d0e4f7' : i % 2 === 0 ? 'transparent' : '#f0f0f0' }}>
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
