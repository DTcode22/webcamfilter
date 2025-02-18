'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamCirclesProps {
  circleSize: number;
  spacing: number;
}

const WebcamCircles: React.FC<WebcamCirclesProps> = ({
  circleSize,
  spacing,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const animationFrameRef = useRef<number | null>(null);

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

  const handleStartRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const stream = canvas.captureStream(30);
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Create and download the video file
      setTimeout(() => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.style.display = 'none';
          a.href = url;
          a.download = 'webcam-circles-recording.webm';
          a.click();
          URL.revokeObjectURL(url);
          setRecordedChunks([]);
        }
      }, 100);
    }
  }, [isRecording, recordedChunks]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  useEffect(() => {
    if (isVideoReady) {
      processFrame();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVideoReady, processFrame]);

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Webcam
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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
};

export default WebcamCircles;
