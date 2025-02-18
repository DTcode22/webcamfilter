'use client';
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
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
      'user'
    );
    const animationFrameRef = useRef<number | null>(null);
    const [key, setKey] = useState(0); // Add key for forcing remount

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

    // Modified recording functions for better mobile performance
    const handleStartRecording = useCallback(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          // Lower framerate and resolution for mobile
          const stream = canvas.captureStream(15); // Reduced from 30 to 15 fps
          const options = {
            mimeType: 'video/webm;codecs=vp8',
            videoBitsPerSecond: 1000000, // 1 Mbps
          };

          mediaRecorderRef.current = new MediaRecorder(stream, options);

          // Use larger chunks to reduce memory pressure
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setRecordedChunks((prev) => [...prev, event.data]);
            }
          };

          // Record in 1-second chunks
          mediaRecorderRef.current.start(1000);
          setIsRecording(true);
        } catch (error) {
          console.error('Error starting recording:', error);
          alert(
            'Failed to start recording. Your device may not support this feature.'
          );
        }
      }
    }, []);

    const handleStopRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Clean up recording
        setTimeout(() => {
          if (recordedChunks.length > 0) {
            try {
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
            } catch (error) {
              console.error('Error saving recording:', error);
              alert('Failed to save recording. Please try again.');
            }
          }
        }, 100);
      }
    }, [isRecording, recordedChunks]);

    const toggleCamera = useCallback(() => {
      setFacingMode((prev) => {
        const newMode = prev === 'user' ? 'environment' : 'user';
        // Force remount of Webcam component
        setKey((k) => k + 1);
        return newMode;
      });
    }, []);

    // Expose methods via ref
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
      };
    }, [isVideoReady, processFrame]);

    const handleVideoReady = useCallback(() => {
      setIsVideoReady(true);
    }, []);

    return (
      <div className="relative w-full h-full">
        <Webcam
          key={key} // Add key to force remount
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
            width: { ideal: 1280 }, // Reduced from 1920
            height: { ideal: 720 }, // Reduced from 1080
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }
);

WebcamCircles.displayName = 'WebcamCircles';

export default WebcamCircles;
