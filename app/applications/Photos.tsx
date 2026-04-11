'use client';

import { useEffect, useState } from 'react';
import FileSystem, { FileItem } from '../components/FileSystem';
import { Icons } from '../icons/icons';
import { useWindowManager } from '../hooks/useWindowManager';

interface PhotosProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

interface Album {
  url: string;
  links: string[];
  thumb: string;
  title: string;
  index: number;
}

const PAGE_SIZE = 24;

export default function Photos({ windowId, focusWindow }: PhotosProps) {
  const { openWindow } = useWindowManager();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.getElementById(windowId)?.focus();

    const source = new EventSource('/api/photos');

    source.onmessage = (e) => {
      const album: Album = JSON.parse(e.data);
      setAlbums((prev) => [...prev, album]);
    };

    source.onerror = () => source.close();

    return () => source.close();
  }, []);

  function toFileItem(album: Album): FileItem {
    return {
      name: album.title,
      icon: Icons.DIRECTORY_PICTURES,
      type: 'folder',
      size: `${album.links.length} photos`,
      onOpen: () => setSelectedAlbum(album),
    };
  }

  if (selectedAlbum) {
    const totalPages = Math.ceil(selectedAlbum.links.length / PAGE_SIZE);
    const pageLinks = selectedAlbum.links.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
      <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
        <div className="photos-toolbar">
          <button className="photos-back-btn" onClick={() => { setSelectedAlbum(null); setPage(0); }}>
            ← Back
          </button>
          <span className="photos-album-title">{selectedAlbum.title}</span>
          {totalPages > 1 && (
            <div className="photos-pagination">
              <button className="photos-back-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>◄</button>
              <span>{page + 1} / {totalPages}</span>
              <button className="photos-back-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1}>►</button>
            </div>
          )}
        </div>
        <div className="photos-grid">
          {pageLinks.map((link, i) => (
            <img
              key={page * PAGE_SIZE + i}
              src={link.replace('=w2048', '=w500')}
              alt={`Photo ${page * PAGE_SIZE + i + 1}`}
              className="photos-thumb"
              loading="lazy"
              onDoubleClick={(e) => {
                e.stopPropagation();
                openWindow('photo-viewer', { title: `Photo ${page * PAGE_SIZE + i + 1}`, props: { src: link } });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <FileSystem items={albums.map(toFileItem)} />
    </div>
  );
}
