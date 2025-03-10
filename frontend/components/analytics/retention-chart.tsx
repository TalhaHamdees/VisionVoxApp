'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';

interface RetentionChartProps {
  retentionData: number[];
  duration: number;
  dropOffPoints: { time: number; percentage: number; type?: string }[];
  engagementSpikes: { time: number; score: number; event: string; type?: string }[];
}

export function RetentionChart({ retentionData, duration, dropOffPoints, engagementSpikes }: RetentionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !retentionData || retentionData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Draw axes
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw y-axis labels (0%, 25%, 50%, 75%, 100%)
    ctx.fillStyle = '#495057';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 4; i++) {
      const y = height - padding - (i * chartHeight / 4);
      const label = `${i * 25}%`;
      ctx.fillText(label, padding - 10, y);
      
      // Draw horizontal grid lines
      ctx.strokeStyle = '#e9ecef';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw x-axis labels (time)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i * chartWidth / 4);
      const timeInSeconds = Math.round(i * duration / 4);
      const label = formatTime(timeInSeconds);
      ctx.fillText(label, x, height - padding + 10);
      
      // Draw vertical grid lines
      ctx.strokeStyle = '#e9ecef';
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Draw retention data
    if (retentionData.length > 1) {
      ctx.strokeStyle = '#228be6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let i = 0; i < retentionData.length; i++) {
        const x = padding + (i * chartWidth / (retentionData.length - 1));
        const y = height - padding - (retentionData[i] * chartHeight / 100);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Fill area under the curve
      ctx.lineTo(padding + chartWidth, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 139, 230, 0.1)';
      ctx.fill();
    }
    
    // Draw drop-off points
    dropOffPoints.forEach(point => {
      const timeRatio = point.time / duration;
      const x = padding + (timeRatio * chartWidth);
      const index = Math.floor(timeRatio * retentionData.length);
      const y = height - padding - (retentionData[index] * chartHeight / 100);
      
      // Draw circle with different colors based on type
      const isLocalMinimum = point.type === 'local_minimum';
      ctx.fillStyle = isLocalMinimum ? '#e03131' : '#fa5252'; // Darker red for local minima
      ctx.beginPath();
      ctx.arc(x, y, isLocalMinimum ? 7 : 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`-${point.percentage}%`, x, y - 10);
    });
    
    // Draw engagement spikes
    engagementSpikes.forEach(spike => {
      const timeRatio = spike.time / duration;
      const x = padding + (timeRatio * chartWidth);
      const index = Math.floor(timeRatio * retentionData.length);
      const y = height - padding - (retentionData[index] * chartHeight / 100);
      
      // Draw different markers based on type
      const isLocalMaximum = spike.type === 'local_maximum';
      ctx.fillStyle = isLocalMaximum ? '#2b8a3e' : '#40c057'; // Darker green for local maxima
      
      if (isLocalMaximum) {
        // Draw star for local maxima
        const size = 8;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const outerX = x + size * Math.cos(angle);
          const outerY = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          
          const innerAngle = angle + Math.PI / 5;
          const innerX = x + size * 0.4 * Math.cos(innerAngle);
          const innerY = y + size * 0.4 * Math.sin(innerAngle);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw triangle for sharp increases
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 6, y);
        ctx.lineTo(x + 6, y);
        ctx.closePath();
        ctx.fill();
      }
    });
    
  }, [retentionData, duration, dropOffPoints, engagementSpikes]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Audience Retention</CardTitle>
        <CardDescription>
          How viewers watch your video over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-[2/1] w-full">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="h-full w-full"
          />
        </div>
        
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Drop-off Points</h4>
            <ul className="mt-2 space-y-1">
              {dropOffPoints.length > 0 ? (
                dropOffPoints.map((point, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span className={`mr-2 h-2 w-2 rounded-full ${point.type === 'local_minimum' ? 'bg-red-600' : 'bg-destructive'}`} />
                    <span className="font-medium">{formatTime(point.time)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {point.percentage}% of viewers left
                      {point.type === 'local_minimum' ? ' (sustained drop)' : ' (sharp drop)'}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No significant drop-offs detected</li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Engagement Spikes</h4>
            <ul className="mt-2 space-y-1">
              {engagementSpikes.length > 0 ? (
                engagementSpikes.slice(0, 3).map((spike, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span className={`mr-2 h-2 w-2 rounded-full ${spike.type === 'local_maximum' ? 'bg-green-700' : 'bg-green-500'}`} />
                    <span className="font-medium">{formatTime(spike.time)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {spike.type === 'local_maximum' ? 'Sustained engagement' : 'Sudden interest'}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No engagement spikes detected</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 