'use client';
import React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamCirclesProps {
  circleSize: number;
  spacing: number;
}

export interface WebcamCirclesRef {
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  toggleCamera: () => void;
}

const WebcamCircles = React.forwardRef<WebcamCirclesRef, WebcamCirclesProps>(
  ({ circleSize, spacing }, ref) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [frames, setFrames] = useState<string[]>([]);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
      'user'
    );
    const animationFrameRef = useRef<number | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [key, setKey] = useState(0);

    const processImageData = useCallback(
      (imageData: ImageData, ctx: CanvasRenderingContext2D) => {
        const { width, height, data } = imageData;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

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
      },
      [circleSize, spacing]
    );

    const captureAndProcess = useCallback(() => {
      const webcam = webcamRef.current;
      const canvas = canvasRef.current;

      if (webcam && canvas) {
        const video = webcam.video;
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          const { videoWidth, videoHeight } = video;
          canvas.width = videoWidth;
          canvas.height = videoHeight;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
            processImageData(imageData, ctx);
          }
        }
      }
    }, [processImageData]);

    const processFrame = useCallback(() => {
      captureAndProcess();
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [captureAndProcess]);

    const captureFrame = useCallback(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          // Reduce the size of the frame for better performance
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCanvas.width = canvas.width / 2;
            tempCanvas.height = canvas.height / 2;
            tempCtx.drawImage(
              canvas,
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            );
            const frame = tempCanvas.toDataURL('image/jpeg', 0.5);
            setFrames((prev) => [...prev, frame]);
          }
        } catch (error) {
          console.error('Error capturing frame:', error);
        }
      }
    }, []);

    const handleStartRecording = useCallback(() => {
      setFrames([]);
      setIsRecording(true);
      // Capture a frame every 200ms (5 fps)
      recordingIntervalRef.current = setInterval(captureFrame, 200);
    }, [captureFrame]);

    const handleStopRecording = useCallback(() => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setIsRecording(false);

      // Create video from frames
      if (frames.length > 0) {
        try {
          const element = document.createElement('a');
          const text = frames.join('\n');
          const blob = new Blob([text], { type: 'text/plain' });
          element.href = URL.createObjectURL(blob);
          element.download = 'webcam-frames.txt';
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
          URL.revokeObjectURL(element.href);
          setFrames([]);
        } catch (error) {
          console.error('Error saving frames:', error);
          alert('Failed to save recording. Please try again.');
        }
      }
    }, [frames]);

    const toggleCamera = useCallback(() => {
      setFacingMode((prev) => {
        const newMode = prev === 'user' ? 'environment' : 'user';
        setKey((k) => k + 1);
        return newMode;
      });
    }, []);

    useEffect(() => {
      if (ref) {
        (ref as React.MutableRefObject<WebcamCirclesRef>).current = {
          handleStartRecording,
          handleStopRecording,
          toggleCamera,
        };
      }
    }, [handleStartRecording, handleStopRecording, toggleCamera, ref]);

    useEffect(() => {
      if (isVideoReady) {
        processFrame();
      }
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
    }, [isVideoReady, processFrame]);

    const handleVideoReady = useCallback(() => {
      setIsVideoReady(true);
    }, []);

    return (
      <div className="relative w-full h-full">
        <Webcam
          key={key}
          ref={webcamRef}
          audio={false}
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedMetadata={handleVideoReady}
          onUserMediaError={(error) => {
            console.error('Error accessing webcam:', error);
            alert(
              'Error accessing webcam. Please check permissions and try again.'
            );
          }}
          videoConstraints={{
            facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-500 px-2 py-1 rounded text-white">
            Recording...
          </div>
        )}
      </div>
    );
  }
);

WebcamCircles.displayName = 'WebcamCircles';

export default WebcamCircles;
