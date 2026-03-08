import { logger } from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
    imageUrl: string;
    onCrop: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export function ImageCropper({ imageUrl, onCrop, onCancel }: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 200, height: 200 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    logger.info('ImageCropper mounted with imageUrl:', imageUrl);

    useEffect(() => {
        logger.info('Loading image...');
        const img = new Image();
        img.onload = () => {
            logger.info('Image loaded:', img.width, 'x', img.height);
            setImage(img);
            // Центрируем кроп
            const size = Math.min(img.width, img.height);
            setCrop({
                x: (img.width - size) / 2,
                y: (img.height - size) / 2,
                width: size,
                height: size,
            });
        };
        img.onerror = (e) => {
            logger.error('Failed to load image:', e);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    useEffect(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Устанавливаем размер canvas
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        // Рисуем изображение
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Затемняем всё кроме области кропа
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Вырезаем область кропа
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(
            crop.x * scale,
            crop.y * scale,
            crop.width * scale,
            crop.height * scale
        );

        // Рисуем рамку кропа
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            crop.x * scale,
            crop.y * scale,
            crop.width * scale,
            crop.height * scale
        );

        // Рисуем сетку 3x3
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            // Вертикальные линии
            ctx.beginPath();
            ctx.moveTo(crop.x * scale + (crop.width * scale * i) / 3, crop.y * scale);
            ctx.lineTo(
                crop.x * scale + (crop.width * scale * i) / 3,
                crop.y * scale + crop.height * scale
            );
            ctx.stroke();

            // Горизонтальные линии
            ctx.beginPath();
            ctx.moveTo(crop.x * scale, crop.y * scale + (crop.height * scale * i) / 3);
            ctx.lineTo(
                crop.x * scale + crop.width * scale,
                crop.y * scale + (crop.height * scale * i) / 3
            );
            ctx.stroke();
        }
    }, [image, crop, scale]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

        // Проверяем, попали ли в область кропа
        if (
            x >= crop.x * scale &&
            x <= (crop.x + crop.width) * scale &&
            y >= crop.y * scale &&
            y <= (crop.y + crop.height) * scale
        ) {
            setIsDragging(true);
            setDragStart({ x: x / scale - crop.x, y: y / scale - crop.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !image) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

        let newX = x / scale - dragStart.x;
        let newY = y / scale - dragStart.y;

        // Ограничиваем перемещение границами изображения
        newX = Math.max(0, Math.min(newX, image.width - crop.width));
        newY = Math.max(0, Math.min(newY, image.height - crop.height));

        setCrop({ ...crop, x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCrop = async () => {
        if (!image) return;

        logger.info('Starting crop with:', { crop, scale, imageSize: { width: image.width, height: image.height } });

        // Создаем временный canvas для кропа
        const tempCanvas = document.createElement('canvas');
        const size = 512; // Размер выходного изображения
        tempCanvas.width = size;
        tempCanvas.height = size;

        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        // Рисуем обрезанную область
        ctx.drawImage(
            image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            size,
            size
        );

        logger.info('Canvas created, converting to blob...');

        // Конвертируем в blob
        tempCanvas.toBlob((blob) => {
            if (blob) {
                logger.info('Blob created successfully:', blob.size, 'bytes');
                onCrop(blob);
            } else {
                logger.error('Failed to create blob');
            }
        }, 'image/jpeg', 0.9);
    };

    const handleZoom = (delta: number) => {
        setScale((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '20px',
            }}
        >
            {/* Header */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>
                    Выберите область
                </h3>
                <div
                    onClick={onCancel}
                    style={{
                        cursor: 'pointer',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '24px',
                    }}
                >
                    ×
                </div>
            </div>

            {/* Canvas */}
            <div
                style={{
                    position: 'relative',
                    maxWidth: '600px',
                    maxHeight: '60vh',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    marginBottom: '20px',
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '60vh',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        display: 'block',
                    }}
                />
            </div>

            {/* Controls */}
            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    marginBottom: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => handleZoom(-0.1)}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '18px',
                    }}
                >
                    −
                </button>
                <span style={{ color: '#fff', minWidth: '60px', textAlign: 'center' }}>
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={() => handleZoom(0.1)}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '18px',
                    }}
                >
                    +
                </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    Отмена
                </button>
                <button
                    onClick={handleCrop}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(0, 242, 255, 0.2)',
                        border: '1px solid rgba(0, 242, 255, 0.5)',
                        borderRadius: '8px',
                        color: '#00f2ff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                    }}
                >
                    Применить
                </button>
            </div>

            {/* Hint */}
            <div
                style={{
                    marginTop: '20px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '13px',
                    textAlign: 'center',
                }}
            >
                Перетащите рамку для выбора области
            </div>
        </div>
    );
}
