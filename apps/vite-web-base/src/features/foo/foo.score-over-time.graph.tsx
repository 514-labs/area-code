"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { IconLoader } from "@tabler/icons-react";
import { NumericFormat } from "react-number-format";
import { GetFoosScoreOverTimeResponse } from "@workspace/models/foo";

export const description = "An interactive score over time chart";

// API Functions
const fetchChartData = async (
  fetchApiEndpoint: string,
  days: number = 90
): Promise<GetFoosScoreOverTimeResponse> => {
  const params = new URLSearchParams({
    days: days.toString(),
  });

  const response = await fetch(`${fetchApiEndpoint}?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch chart data");

  return response.json();
};

const chartConfig = {
  averageScore: {
    label: "Average Score",
    color: "var(--primary)",
  },
  totalCount: {
    label: "Total Records",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function FooScoreOverTimeGraph({
  fetchApiEndpoint,
  disableCache = false,
}: {
  fetchApiEndpoint: string;
  disableCache?: boolean;
}) {
  const isMobile = useIsMobile();
  const [days, setDays] = React.useState(90);

  // Use React Query to fetch chart data
  const {
    data: chartResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["foo-score-over-time", fetchApiEndpoint, days],
    queryFn: () => fetchChartData(fetchApiEndpoint, days),
    placeholderData: (previousData) => previousData,
    staleTime: disableCache ? 0 : 1000 * 60 * 5, // 5 minutes when enabled
    gcTime: disableCache ? 0 : 1000 * 60 * 10, // 10 minutes when enabled
    refetchOnMount: disableCache ? "always" : false,
    refetchOnWindowFocus: false,
  });

  const chartData = chartResponse?.data || [];
  const queryTime = chartResponse?.queryTime;

  // Memoized Y-axis domain calculation
  const yAxisDomain = React.useMemo(() => {
    if (chartData.length === 0) return [0, 10];

    const scores = chartData
      .map((item) => item.averageScore)
      .filter((score) => score > 0);
    if (scores.length === 0) return [0, 10];

    const min = Math.min(...scores);
    const max = Math.max(...scores);

    const domainMin = Math.floor(min);
    const domainMax = Math.ceil(max);
    return [domainMin, domainMax];
  }, [chartData]);

  // Get the time range description for display
  const getTimeRangeDescription = (days: number) => {
    if (days === 7) return "Last 7 days";
    if (days === 30) return "Last 30 days";
    if (days === 90) return "Last 3 months";
    if (days === 180) return "Last 6 months";
    return `Last ${days} days`;
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-baseline gap-2">
            <span>Score Over Time </span>
            <span className="text-xs font-normal text-green-500">
              {queryTime && (
                <>
                  Latest query time:{" "}
                  <NumericFormat
                    value={Math.round(queryTime || 0)}
                    displayType="text"
                    thousandSeparator=","
                  />
                  ms
                </>
              )}
            </span>
          </span>
        </CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Average score trends over{" "}
            {getTimeRangeDescription(days).toLowerCase()}
          </span>
          <span className="@[540px]/card:hidden">
            {getTimeRangeDescription(days)}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={days.toString()}
            onValueChange={(value) => setDays(Number(value))}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="7">Last 7 days</ToggleGroupItem>
            <ToggleGroupItem value="30">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="90">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="180">Last 6 months</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={days.toString()}
            onValueChange={(value) => setDays(Number(value))}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="30" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="180" className="rounded-lg">
                Last 6 months
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="flex items-center gap-2">
              <IconLoader className="animate-spin" />
              Loading chart data...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-red-500">
              Error loading chart data: {error.message}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">
              No data available for the selected time range
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="fillAverageScore"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-averageScore)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-averageScore)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis hide domain={yAxisDomain} />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : Math.floor(chartData.length / 2)}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: string | number) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    formatter={(value, name) => {
                      if (name === "averageScore") {
                        return [Number(value).toFixed(2), " Average Score"];
                      }
                      if (name === "totalCount") {
                        return [value, "Records"];
                      }
                      return [value, name];
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="averageScore"
                type="monotone"
                fill="url(#fillAverageScore)"
                stroke="var(--color-averageScore)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
