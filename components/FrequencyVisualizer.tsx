
import React, { useEffect, useRef } from 'react';

interface Props {
  data: Uint8Array;
}

const FrequencyVisualizer: React.FC<Props> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width / data.length) * 2.5;

    ctx.clearRect(0, 0, width, height);
    
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * height;

      // Color based on frequency height (intensity)
      const r = data[i] + (25 * (i / data.length));
      const g = 250 * (i / data.length);
      const b = 50;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }, [data]);

  return (
    <div className="w-full h-32 bg-slate-800 rounded-lg overflow-hidden relative">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={128} 
        className="w-full h-full"
      />
      <div className="absolute top-1 left-2 text-[10px] text-slate-400 font-mono">FFT ANALYSIS (20Hz - 20kHz)</div>
    </div>
  );
};

export default FrequencyVisualizer;
