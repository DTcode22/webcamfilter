'use client';

import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

const WebcamCircles: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    let animationFrameId: number;

    const processFrame = () => {
      captureAndProcess();
      animationFrameId = requestAnimationFrame(processFrame);
    };

    if (isVideoReady) {
      processFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVideoReady]);

  const captureAndProcess = () => {
    const webcam = webcamRef.current;
    const canvas = canvasRef.current;

    if (webcam && canvas) {
      const video = webcam.video;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const { videoWidth, videoHeight } = video;
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
          const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
          processImageData(imageData, ctx);
        }
      }
    }
  };

  const processImageData = (
    imageData: ImageData,
    ctx: CanvasRenderingContext2D
  ) => {
    const { width, height, data } = imageData;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    const circleSize = 10;
    const spacing = 12;

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const radius = (brightness / 255) * (circleSize / 2);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    }
  };

  const handleVideoReady = () => {
    setIsVideoReady(true);
  };

  return (
    <div className="relative w-screen h-screen">
      <Webcam
        ref={webcamRef}
        audio={false}
        className="absolute inset-0 w-full h-full object-cover"
        onLoadedMetadata={handleVideoReady}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
};

export default WebcamCircles;
