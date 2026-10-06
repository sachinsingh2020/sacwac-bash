"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function ImageCropperModal({
  imageSrc,
  onCancel,
  onCropComplete,
  isProcessing = false,
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load Image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Render crop preview on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Calculate base scale to cover viewport
    const isRotatedQuarter = rotation === 90 || rotation === 270;
    const sourceW = isRotatedQuarter ? img.height : img.width;
    const sourceH = isRotatedQuarter ? img.width : img.height;

    const baseScale = Math.max(width / sourceW, height / sourceH);
    const currentScale = baseScale * zoom;

    ctx.save();
    // Center transformations
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.translate(pan.x, pan.y);

    // Draw the image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Draw circular/rounded crop guideline overlay
    ctx.save();
    // Dim the exterior
    ctx.fillStyle = "rgba(20, 10, 15, 0.4)";
    ctx.fillRect(0, 0, width, height);

    // Clear the center crop circle/aperture
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const radius = Math.min(width, height) * 0.44;
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Reset composite operation and draw ring
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rule of thirds subtle lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    const third = (radius * 2) / 3;
    const left = width / 2 - radius;
    const top = height / 2 - radius;

    ctx.strokeRect(left, top, radius * 2, radius * 2);
    ctx.restore();
  }, [imageLoaded, zoom, rotation, pan]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer Drag Handlers (touch & mouse)
  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !imageRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const isRotatedQuarter = rotation === 90 || rotation === 270;
    const sourceW = isRotatedQuarter ? img.height : img.width;
    const sourceH = isRotatedQuarter ? img.width : img.height;
    const baseScale = Math.max(canvas.width / sourceW, canvas.height / sourceH);
    const currentScale = baseScale * zoom;

    // Convert screen dx/dy according to rotation
    let rad = (-rotation * Math.PI) / 180;
    let rdx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / currentScale;
    let rdy = (dx * Math.sin(rad) + dy * Math.cos(rad)) / currentScale;

    setPan({
      x: panStartRef.current.x + rdx,
      y: panStartRef.current.y + rdy,
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.7), 3));
  };

  // Perform Final Crop Export
  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const exportSize = 800;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportSize, exportSize);

    const isRotatedQuarter = rotation === 90 || rotation === 270;
    const sourceW = isRotatedQuarter ? img.height : img.width;
    const sourceH = isRotatedQuarter ? img.width : img.height;

    // Viewport preview width was 320, aperture radius was 320 * 0.44 * 2 = 281.6
    const previewCanvas = canvasRef.current;
    const previewW = previewCanvas ? previewCanvas.width : 320;
    const apertureSize = previewW * 0.44 * 2;
    const exportScaleRatio = exportSize / apertureSize;

    const baseScale = Math.max(previewW / sourceW, previewW / sourceH);
    const currentScale = baseScale * zoom * exportScaleRatio;

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.translate(pan.x, pan.y);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="cropper-modal-overlay" onClick={onCancel}>
      <div
        className="cropper-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cropper-header">
          <div>
            <h3 className="cropper-title">Crop Your Portrait 📸</h3>
            <p className="cropper-subtitle">
              Drag to reposition • Use slider to zoom
            </p>
          </div>
          <button
            type="button"
            className="cropper-close-btn"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="cropper-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="cropper-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
          />
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="cropper-controls-row">
          <div className="cropper-zoom-box">
            <span className="cropper-ctrl-icon">🔍</span>
            <input
              type="range"
              min="0.7"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="cropper-zoom-slider"
              aria-label="Zoom photo"
            />
            <span className="cropper-zoom-value">{Math.round(zoom * 100)}%</span>
          </div>

          <button
            type="button"
            className="cropper-rotate-btn"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            title="Rotate 90 degrees"
          >
            ↻ Rotate
          </button>
        </div>

        {/* Action Buttons */}
        <div className="cropper-actions-row">
          <button
            type="button"
            className="btn-cropper-cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-cropper-apply"
            onClick={handleApplyCrop}
            disabled={isProcessing || !imageLoaded}
          >
            {isProcessing ? "Processing... 🔄" : "Crop & Use Photo ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}
