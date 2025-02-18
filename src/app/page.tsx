'use client';
import { useRef } from 'react';
import { useState } from 'react';
import WebcamCircles, { WebcamCirclesRef } from './WebcamCircles';

export default function Home() {
  const [circleSize, setCircleSize] = useState(10);
  const [spacing, setSpacing] = useState(12);
  const webcamCirclesRef = useRef<WebcamCirclesRef>(null);

  return (
    <main className="w-screen h-screen relative">
      <WebcamCircles
        ref={webcamCirclesRef}
        circleSize={circleSize}
        spacing={spacing}
      />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black/50 p-4 rounded-lg text-white space-y-4">
        <div>
          <label>Circle Size: </label>
          <input
            type="range"
            min="5"
            max="30"
            value={circleSize}
            onChange={(e) => setCircleSize(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Spacing: </label>
          <input
            type="range"
            min="5"
            max="30"
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              webcamCirclesRef.current?.handleStartRecording();
            }}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Start Recording
          </button>
          <button
            onClick={() => {
              webcamCirclesRef.current?.handleStopRecording();
            }}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Stop Recording
          </button>
          <button
            onClick={() => {
              webcamCirclesRef.current?.toggleCamera();
            }}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Switch Camera
          </button>
        </div>
      </div>
    </main>
  );
}
