'use client';

interface PhotoViewerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  src: string;
}

export default function PhotoViewer({ windowId, focusWindow, src }: PhotoViewerProps) {
  return (
    <div
      className="app-content photo-viewer"
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      <img src={src} alt="" className="photo-viewer-img" />
    </div>
  );
}
