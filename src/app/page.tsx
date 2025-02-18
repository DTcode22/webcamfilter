// page.tsx
'use client';
import { useState } from 'react';
import WebcamCircles from './WebcamCircles';

export default function Home() {
  const [circleSize, setCircleSize] = useState(10);
  const [spacing, setSpacing] = useState(12);

  return (
    <main className="w-screen h-screen relative">
      <WebcamCircles circleSize={circleSize} spacing={spacing} />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black/50 p-4 rounded-lg text-white">
        <div className="mb-4">
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
      </div>
    </main>
  );
}
