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
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
      'user'
    );
    const animationFrameRef = useRef<number | null>(null);
    const [key, setKey] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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
      setDownloadUrl(null);
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const stream = canvas.captureStream(10); // Lower framerate
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=h264',
            videoBitsPerSecond: 500000, // 500 Kbps
          });

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setRecordedChunks((prev) => [...prev, event.data]);
            }
          };

          recorder.start(1000); // Collect in 1-second chunks
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
          setRecordedChunks([]);
        } catch (error) {
          console.error('Error starting recording:', error);
          alert('Could not start recording. Please try again.');
        }
      }
    }, []);

    const handleStopRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Create download URL after recording is complete
        mediaRecorderRef.current.onstop = () => {
          try {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
          } catch (error) {
            console.error('Error creating video:', error);
            alert('Error creating video. Please try again.');
          }
        };
      }
    }, [isRecording, recordedChunks]);

    const toggleCamera = useCallback(() => {
      setFacingMode((prev) => {
        const newMode = prev === 'user' ? 'environment' : 'user';
        setKey((k) => k + 1);
        return newMode;
      });
    }, []);

    // Cleanup download URL when component unmounts
    useEffect(() => {
      return () => {
        if (downloadUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
      };
    }, [downloadUrl]);

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
        {downloadUrl && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded text-white">
            <a
              href={downloadUrl}
              download="webcam-recording.webm"
              className="text-blue-400 hover:text-blue-300"
            >
              Download Recording
            </a>
          </div>
        )}
      </div>
    );
  }
);

WebcamCircles.displayName = 'WebcamCircles';

export default WebcamCircles;
