"use client";

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
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
import { IconLoader } from "@tabler/icons-react";
import { NumericFormat } from "react-number-format";
import {
  GetFooRollingSegmentationParams,
  GetFooRollingSegmentationResponse,
  GetFooFiltersValuesResponse,
} from "@workspace/models/foo";

const fetchData = async (
  apiEndpoint: string,
  params: GetFooRollingSegmentationParams
): Promise<GetFooRollingSegmentationResponse> => {
  const query = new URLSearchParams();
  if (params.days) query.set("days", String(params.days));
  if (params.windowDays) query.set("windowDays", String(params.windowDays));
  if (params.priority !== undefined)
    query.set("priority", String(params.priority));
  const response = await fetch(`${apiEndpoint}?${query.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch data");
  return response.json();
};

const fetchFilterValues = async (
  apiEndpoint: string
): Promise<GetFooFiltersValuesResponse> => {
  const baseEndpoint = apiEndpoint.replace(
    "foo-rolling-segmentation",
    "foo-filters-values"
  );
  const response = await fetch(baseEndpoint);
  if (!response.ok) throw new Error("Failed to fetch filter values");
  return response.json();
};

const chartConfig = {
  avgScoreRolling: { label: "Avg Score (Rolling)", color: "var(--primary)" },
} satisfies ChartConfig;

export function FooRollingSegmentationGraph({
  apiEndpoint,
  disableCache = false,
}: {
  apiEndpoint: string;
  disableCache?: boolean;
}) {
  const [days, setDays] = React.useState<number>(90);
  const [windowDays, setWindowDays] = React.useState<number>(90);
  const [priority, setPriority] = React.useState<number | undefined>(undefined);
  const [selectedSegment, setSelectedSegment] =
    React.useState<string>("all-active");

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "foo-rolling-segmentation",
      apiEndpoint,
      days,
      windowDays,
      priority,
    ],
    queryFn: () => fetchData(apiEndpoint, { days, windowDays, priority }),
    placeholderData: (prev) => prev,
    staleTime: disableCache ? 0 : 1000 * 60 * 5,
    gcTime: disableCache ? 0 : 1000 * 60 * 10,
    refetchOnMount: disableCache ? "always" : false,
    refetchOnWindowFocus: false,
  });

  const { data: filterValues } = useQuery({
    queryKey: ["foo-filter-values", apiEndpoint],
    queryFn: () => fetchFilterValues(apiEndpoint),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const queryTime = data?.queryTime;
  const points = data?.data ?? [];

  const segments = React.useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => set.add(`${p.status}::${p.tag}`));
    return Array.from(set);
  }, [points]);

  React.useEffect(() => {
    if (segments.length > 0 && !segments.includes(selectedSegment)) {
      setSelectedSegment(segments[0]);
    }
  }, [segments, selectedSegment]);

  const [statusPart, tagPart] = selectedSegment.split("::");
  const filtered = points
    .filter((p) =>
      selectedSegment ? p.status === statusPart && p.tag === tagPart : true
    )
    .map((p) => ({
      date: p.date,
      avgScoreRolling: p.avgScoreRolling,
    }));

  const tickFormatter = React.useCallback((value: any) => {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const labelFormatter = React.useCallback((value: string | number) => {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const yAxisDomain = React.useMemo(() => {
    if (filtered.length === 0) return [0, 10];

    const scores = filtered
      .map((item) => item.avgScoreRolling)
      .filter((score) => score > 0);
    if (scores.length === 0) return [0, 10];

    const min = Math.min(...scores);
    const max = Math.max(...scores);

    const domainMin = Math.floor(min);
    const domainMax = Math.ceil(max);
    return [domainMin, domainMax];
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-baseline gap-2">
            <span>Rolling Avg Score by Status × Tag</span>
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
          Select a segment to view its rolling average
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-5 flex flex-col">
        <div className="flex gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-36" size="sm">
              <SelectValue placeholder="Days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(windowDays)}
            onValueChange={(v) => setWindowDays(Number(v))}
          >
            <SelectTrigger className="w-44" size="sm">
              <SelectValue placeholder="Window" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7">7-day window</SelectItem>
              <SelectItem value="30">30-day window</SelectItem>
              <SelectItem value="90">90-day window</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priority !== undefined ? String(priority) : "all"}
            onValueChange={(v) =>
              setPriority(v === "all" ? undefined : Number(v))
            }
          >
            <SelectTrigger className="w-32" size="sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All priorities</SelectItem>
              {filterValues?.priorities?.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  Priority {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue placeholder="Segment (status × tag)" />
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-auto rounded-xl">
              {segments.map((seg) => (
                <SelectItem key={seg} value={seg} className="rounded-lg">
                  {seg.replace("::", " × ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">No data available</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
            debounce={300}
          >
            <LineChart data={filtered}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={tickFormatter}
              />
              <YAxis hide domain={yAxisDomain} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={labelFormatter}
                    indicator="line"
                  />
                }
              />
              <Line
                dataKey="avgScoreRolling"
                type="monotone"
                stroke="var(--color-avgScoreRolling)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
