/** A single item in the virtual museum collection. */
export interface MuseumItem {
  name: string;
  image: string;
  year: number;
  description: string;
}

/** Shape returned by `GET /api/museum`. */
export interface MuseumResponse {
  cameras: MuseumItem[];
  computers: MuseumItem[];
  consoles: MuseumItem[];
}
