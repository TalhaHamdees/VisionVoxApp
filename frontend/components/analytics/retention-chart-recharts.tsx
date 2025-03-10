"use client"

import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RetentionChartProps {
  retentionData: number[];
  duration: number;
  dropOffPoints: { time: number; percentage: number; type?: string }[];
  engagementSpikes: { time: number; score: number; event: string; type?: string }[];
}

interface ChartDataPoint {
  timeRatio: number;
  timeInSeconds: number;
  timeFormatted: string;
  retention: number;
  isDropOff?: boolean;
  dropOffPercentage?: number;
  dropOffType?: string;
  isSpike?: boolean;
  spikeScore?: number;
  spikeEvent?: string;
  spikeType?: string;
}

export function RetentionChartRecharts({ retentionData, duration, dropOffPoints, engagementSpikes }: RetentionChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // Calculate overall retention metrics
  const averageRetention = retentionData.length > 0 
    ? Math.round(retentionData.reduce((sum, value) => sum + value, 0) / retentionData.length) 
    : 0;
  
  // Calculate retention at key points (25%, 50%, 75%, 100%)
  const getRetentionAtPercentage = (percentage: number) => {
    if (retentionData.length === 0) return 0;
    const index = Math.floor((retentionData.length - 1) * (percentage / 100));
    return retentionData[index];
  };
  
  const retention25 = getRetentionAtPercentage(25);
  const retention50 = getRetentionAtPercentage(50);
  const retention75 = getRetentionAtPercentage(75);
  const retentionEnd = retentionData.length > 0 ? retentionData[retentionData.length - 1] : 0;
  
  // Calculate retention quality score (0-100)
  const calculateRetentionScore = () => {
    if (retentionData.length === 0) return 0;
    
    // Weight different parts of the video
    const weights = {
      average: 0.4,
      end: 0.3,
      dropOffs: 0.3
    };
    
    // Score based on average retention (0-100)
    const averageScore = averageRetention;
    
    // Score based on end retention (0-100)
    const endScore = retentionEnd;
    
    // Score based on drop-offs (0-100)
    // Fewer drop-offs and smaller drop-offs = higher score
    const maxDropOffPercentage = dropOffPoints.length > 0 
      ? Math.max(...dropOffPoints.map(p => p.percentage))
      : 0;
    const dropOffScore = 100 - (maxDropOffPercentage * 2);
    
    // Calculate weighted score
    const weightedScore = (
      averageScore * weights.average +
      endScore * weights.end +
      dropOffScore * weights.dropOffs
    );
    
    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  };
  
  const retentionScore = calculateRetentionScore();
  
  // Get retention quality label
  const getRetentionQualityLabel = (score: number) => {
    if (score >= 90) return 'Exceptional';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 40) return 'Below Average';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
  };
  
  const retentionQuality = getRetentionQualityLabel(retentionScore);
  
  // Process the data for the chart
  useEffect(() => {
    if (!retentionData || retentionData.length === 0) return;
    
    // Create data points for the chart
    const data: ChartDataPoint[] = retentionData.map((value, index) => {
      const timeRatio = index / (retentionData.length - 1);
      const timeInSeconds = Math.round(timeRatio * duration);
      
      return {
        timeRatio,
        timeInSeconds,
        timeFormatted: formatTime(timeInSeconds),
        retention: value,
      };
    });
    
    // Add markers for drop-off points
    dropOffPoints.forEach(point => {
      const timeRatio = point.time / duration;
      const closestIndex = Math.floor(timeRatio * data.length);
      
      if (closestIndex >= 0 && closestIndex < data.length) {
        data[closestIndex].isDropOff = true;
        data[closestIndex].dropOffPercentage = point.percentage;
        data[closestIndex].dropOffType = point.type;
      }
    });
    
    // Add markers for engagement spikes
    engagementSpikes.forEach(spike => {
      const timeRatio = spike.time / duration;
      const closestIndex = Math.floor(timeRatio * data.length);
      
      if (closestIndex >= 0 && closestIndex < data.length) {
        data[closestIndex].isSpike = true;
        data[closestIndex].spikeScore = spike.score;
        data[closestIndex].spikeEvent = spike.event;
        data[closestIndex].spikeType = spike.type;
      }
    });
    
    setChartData(data);
  }, [retentionData, duration, dropOffPoints, engagementSpikes]);
  
  // Chart configuration
  const chartConfig = {
    retention: {
      label: "Audience Retention",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Time
              </span>
              <span className="font-bold text-foreground">
                {data.timeFormatted}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Retention
              </span>
              <span className="font-bold text-foreground">
                {data.retention}%
              </span>
            </div>
          </div>
          
          {/* Removed drop-off and engagement spike information */}
        </div>
      );
    }
    
    return null;
  };
  
  // Custom dot component to highlight drop-offs and spikes
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (payload.isDropOff) {
      const isLocalMinimum = payload.dropOffType === 'local_minimum';
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={isLocalMinimum ? 6 : 5} 
          fill={isLocalMinimum ? '#e03131' : '#fa5252'} 
          stroke="white" 
          strokeWidth={1} 
        />
      );
    }
    
    if (payload.isSpike) {
      const isLocalMaximum = payload.spikeType === 'local_maximum';
      
      if (isLocalMaximum) {
        // Draw star for local maxima
        const size = 6;
        const points = [];
        
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const outerX = cx + size * Math.cos(angle);
          const outerY = cy + size * Math.sin(angle);
          
          const innerAngle = angle + Math.PI / 5;
          const innerX = cx + size * 0.4 * Math.cos(innerAngle);
          const innerY = cy + size * 0.4 * Math.sin(innerAngle);
          
          points.push(outerX, outerY, innerX, innerY);
        }
        
        return (
          <polygon 
            points={points.join(',')} 
            fill="#2b8a3e" 
            stroke="white" 
            strokeWidth={1} 
          />
        );
      } else {
        // Draw triangle for sharp increases
        return (
          <polygon 
            points={`${cx},${cy-6} ${cx-4},${cy} ${cx+4},${cy}`} 
            fill="#40c057" 
            stroke="white" 
            strokeWidth={1} 
          />
        );
      }
    }
    
    return null;
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Audience Retention</CardTitle>
        <CardDescription>
          How viewers watch your video over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Retention Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
            <div className="text-2xl font-bold">{averageRetention}%</div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
            <div className="text-2xl font-bold">{retention25}%</div>
            <div className="text-xs text-muted-foreground">At 25%</div>
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
            <div className="text-2xl font-bold">{retention50}%</div>
            <div className="text-xs text-muted-foreground">At 50%</div>
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
            <div className="text-2xl font-bold">{retention75}%</div>
            <div className="text-xs text-muted-foreground">At 75%</div>
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center shadow-sm">
            <div className="text-2xl font-bold">{retentionEnd}%</div>
            <div className="text-xs text-muted-foreground">At End</div>
          </div>
        </div>
        
        {/* Retention Quality Score */}
        <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <div className="text-sm font-medium">Retention Quality</div>
            <div className="text-2xl font-bold">{retentionQuality}</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary">
            <span className="text-xl font-bold">{retentionScore}</span>
          </div>
        </div>
        
        {/* Retention Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="timeFormatted" 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12 }}
                tickFormatter={(value, index) => {
                  // Show fewer ticks for better readability
                  return index % Math.ceil(chartData.length / 5) === 0 ? value : '';
                }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="retention" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorRetention)"
                activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 