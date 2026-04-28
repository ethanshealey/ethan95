'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Frame, GroupBox, ProgressBar, Slider } from 'react95';
import { compressImage } from '../helpers/CompressionHelper';

interface CompressProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

export default function Compress({ windowId, focusWindow, defaultContent }: CompressProps) {

    const [ image, setImage ] = useState<File | null>(null);
    const [ imageUrl, setImageUrl ] = useState<string | null>(null);
    const [ compressionLevel, setCompressionLevel ] = useState<number>(50);
    const [ isCompressing, setIsCompressing ] = useState<boolean>(false);
    const [ quality, setQuality ] = useState<number>(100);
    const [ scale, setScale ] = useState<number>(1);
    const [ originalSize, setOriginalSize ] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        document.getElementById(windowId)?.focus();
    }, [])

    useEffect(() => {
        if (!image) { setImageUrl(null); return; }
        const url = URL.createObjectURL(image);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [image])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const fileList: FileList | null = e.target.files ?? null;

        if (!fileList || fileList.length === 0) {
            console.error('No file selected');
            return;
        }

        const imageFile: File = fileList[0];

        const bitmap = await createImageBitmap(imageFile);
        setOriginalSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();

        setImage(imageFile);
        setQuality(100);
        setScale(1);

    }


    const compress = async () => {

        if (!image) return

        try {

            // const targetSizeKb = Math.max(image.size / 1024 * (1 - (compressionLevel+10) / 100), .001);

            // console.log(`Target size: ${targetSizeKb} KB -- Current size: ${image.size / 1024} KB`);

            setIsCompressing(true)
            const nextQuality = Math.max(1, quality - compressionLevel);
            const nextScale = scale * (1 - compressionLevel / 200);
            const compressedFile = await compressImage(image, nextQuality, nextScale, originalSize ?? undefined);
            const renamedFile = new File([compressedFile], image.name, { type: compressedFile.type });
            setImage(_ => renamedFile);
            setQuality(nextQuality);
            setScale(nextScale);
            setIsCompressing(false)

        } catch (error) {
            console.log(error);
            setIsCompressing(false)
        }

    }

    const convertSizeToReadable = (sizeInBytes: number) => {
        if (sizeInBytes < 1024) return `${sizeInBytes} B`;
        if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(2)} KB`;
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const download = () => {
        if(!image) return

        const url = URL.createObjectURL(image);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `compressed_${image.name}`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
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
                                        style={{
                                            width: '80%'
                                        }}
                                    />
                                </div>
                                <Button onClick={compress} fullWidth style={{ marginTop: '10px' }}>Compress</Button>
                            </GroupBox>
                            <Button onClick={download} style={{ marginTop: '10px' }} variant='default'>Download</Button>
                        </div>
                    )
                }
            </Frame>
        </div>
    );
}
