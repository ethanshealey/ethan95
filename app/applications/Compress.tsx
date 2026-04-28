'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Frame, GroupBox, Slider } from 'react95';

interface CompressProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

/** Scale + encode ImageData to a JPEG File using DOM canvas (main thread only). */
const encodeImageData = (
    imageData: ImageData,
    filename: string,
    scale: number,
    targetSize?: { width: number; height: number },
    jpegQuality = 0.92,
): Promise<File> => {
    const type = 'image/jpeg'
    const smallW = Math.max(1, Math.round(imageData.width * scale))
    const smallH = Math.max(1, Math.round(imageData.height * scale))
    const outW = targetSize?.width ?? smallW
    const outH = targetSize?.height ?? smallH

    const src = document.createElement('canvas')
    src.width = imageData.width
    src.height = imageData.height
    src.getContext('2d')!.putImageData(imageData, 0, 0)

    const small = document.createElement('canvas')
    small.width = smallW
    small.height = smallH
    const smallCtx = small.getContext('2d')!
    smallCtx.imageSmoothingEnabled = false
    smallCtx.drawImage(src, 0, 0, smallW, smallH)

    const out = document.createElement('canvas')
    out.width = outW
    out.height = outH
    const outCtx = out.getContext('2d')!
    outCtx.imageSmoothingEnabled = false
    outCtx.drawImage(small, 0, 0, outW, outH)

    return new Promise<File>(resolve =>
        out.toBlob(b => resolve(new File([b!], filename, { type })), type, jpegQuality)
    )
}

export default function Compress({ windowId, focusWindow, defaultContent }: CompressProps) {

    const [ image, setImage ] = useState<File | null>(null);
    const [ imageUrl, setImageUrl ] = useState<string | null>(null);
    const [ compressionLevel, setCompressionLevel ] = useState<number>(50);
    const [ isCompressing, setIsCompressing ] = useState<boolean>(false);
    const [ quality, setQuality ] = useState<number>(100);
    const [ scale, setScale ] = useState<number>(1);
    const [ originalSize, setOriginalSize ] = useState<{ width: number; height: number } | null>(null);

    const workerPoolRef = useRef<Worker[]>([]);

    useEffect(() => {
        document.getElementById(windowId)?.focus();
        const n = Math.min(Math.max(navigator.hardwareConcurrency ?? 4, 1), 8);
        workerPoolRef.current = Array.from({ length: n }, () =>
            new Worker(new URL('../helpers/CompressionWorker.ts', import.meta.url))
        );
        return () => {
            workerPoolRef.current.forEach(w => w.terminate());
            workerPoolRef.current = [];
        };
    }, [])

    useEffect(() => {
        if (!image) { setImageUrl(null); return; }
        const url = URL.createObjectURL(image);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList: FileList | null = e.target.files ?? null;
        if (!fileList || fileList.length === 0) return;

        const imageFile: File = fileList[0];
        const bitmap = await createImageBitmap(imageFile);
        setOriginalSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();

        setImage(imageFile);
        setQuality(100);
        setScale(1);
    }

    const compress = async () => {
        const workers = workerPoolRef.current;
        if (!image || workers.length === 0) return;

        setIsCompressing(true);
        const nextQuality = Math.max(1, quality - compressionLevel);
        const nextScale = scale * (1 - compressionLevel / 200);

        try {
            // Decode image to raw pixels on the main thread
            const bitmap = await createImageBitmap(image);
            const { width, height } = bitmap;
            const srcCanvas = document.createElement('canvas');
            srcCanvas.width = width;
            srcCanvas.height = height;
            const srcCtx = srcCanvas.getContext('2d')!;
            srcCtx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const { data } = srcCtx.getImageData(0, 0, width, height);

            // Split into strips aligned to 8-px rows so blocks don't straddle boundaries
            const n = workers.length;
            const stripH = Math.ceil(Math.ceil(height / n) / 8) * 8;

            const stripDefs = Array.from({ length: n }, (_, i) => {
                const startY = i * stripH;
                const rows = Math.min(startY + stripH, height) - startY;
                return startY < height ? { startY, rows } : null;
            }).filter((s): s is { startY: number; rows: number } => s !== null);

            // Copy each strip into its own buffer and transfer to a worker
            const results = await Promise.all(
                stripDefs.map(({ startY, rows }, i) =>
                    new Promise<{ startY: number; pixels: Uint8ClampedArray }>((resolve, reject) => {
                        const strip = new Uint8ClampedArray(rows * width * 4);
                        strip.set(data.subarray(startY * width * 4, (startY + rows) * width * 4));
                        workers[i].onmessage = (e) =>
                            resolve({ startY, pixels: new Uint8ClampedArray(e.data.pixels) });
                        workers[i].onerror = reject;
                        workers[i].postMessage(
                            { pixels: strip.buffer, width, height: rows, quality: nextQuality },
                            { transfer: [strip.buffer as ArrayBuffer] },
                        );
                    })
                )
            );

            // Reassemble strips into a single ImageData
            const outData = new Uint8ClampedArray(width * height * 4);
            for (const { startY, pixels } of results) {
                outData.set(pixels, startY * width * 4);
            }

            // Scale + encode on the main thread
            const compressedFile = await encodeImageData(
                new ImageData(outData, width, height),
                image.name,
                nextScale,
                originalSize ?? undefined,
                nextQuality / 100,
            );
            const renamedFile = new File([compressedFile], image.name, { type: compressedFile.type });
            setImage(_ => renamedFile);
            setQuality(nextQuality);
            setScale(nextScale);

        } catch (err) {
            console.error(err);
        } finally {
            setIsCompressing(false);
        }
    }

    const convertSizeToReadable = (sizeInBytes: number) => {
        if (sizeInBytes < 1024) return `${sizeInBytes} B`;
        if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(2)} KB`;
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const download = () => {
        if (!image) return;
        const url = URL.createObjectURL(image);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${image.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <Frame variant='well' style={{ padding: '10px', height: '100%', width: '100%', overflowY: 'scroll' }}>
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <Button fullWidth>Choose File</Button>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer',
                            width: '100%',
                            height: '100%',
                        }}
                    />
                </div>
                {
                    image && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            marginTop: '10px',
                        }}>
                            <img src={imageUrl ?? defaultContent} alt="Selected" style={{ maxWidth: '75%', maxHeight: '300px', marginTop: '10px' }} />
                            <p>Current Size: <b>{isCompressing ? '---' : convertSizeToReadable(image.size)}</b></p>
                            <GroupBox label='Compression Settings' style={{ width: '90%' }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    marginTop: '10px',
                                }}>
                                    <Slider
                                        min={0}
                                        max={99}
                                        step={1}
                                        defaultValue={50}
                                        value={compressionLevel}
                                        onChange={(value) => setCompressionLevel(value as number)}
                                        marks={[
                                            { value: 0, label: 'Light' },
                                            { value: 50, label: 'Medium' },
                                            { value: 99, label: 'Extreme' }
                                        ]}
                                        style={{ width: '80%' }}
                                    />
                                </div>
                                <Button onClick={compress} fullWidth style={{ marginTop: '10px' }} disabled={isCompressing}>
                                    {isCompressing ? 'Compressing...' : 'Compress'}
                                </Button>
                            </GroupBox>
                            <Button onClick={download} style={{ marginTop: '10px' }} variant='default'>Download</Button>
                        </div>
                    )
                }
            </Frame>
        </div>
    );
}
