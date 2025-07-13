import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { IconChartBar, IconClock, IconRefresh } from "@tabler/icons-react";

interface AverageValueResponse {
  averageValue: number;
  queryTime: number;
  count: number;
}

interface BarAverageValueProps {
  apiEndpoint: string;
  disableCache?: boolean;
}

// API function to fetch average value
const fetchAverageValue = async (
  apiEndpoint: string
): Promise<AverageValueResponse> => {
  const response = await fetch(apiEndpoint);
  if (!response.ok) throw new Error("Failed to fetch average value");
  return response.json();
};

export default function BarAverageValue({
  apiEndpoint,
  disableCache = false,
}: BarAverageValueProps) {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["bar-average-value", apiEndpoint],
    queryFn: () => fetchAverageValue(apiEndpoint),
    staleTime: disableCache ? 0 : 1000 * 60 * 5, // 5 minutes when enabled
    gcTime: disableCache ? 0 : 1000 * 60 * 10, // 10 minutes when enabled
    refetchOnMount: disableCache ? "always" : false,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconChartBar className="h-5 w-5" />
              <CardTitle>Average Value</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <IconRefresh
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <CardDescription>Failed to load average value</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Average Value</CardTitle>
            {isFetching && (
              <Badge variant="outline">
                <IconClock className="h-3 w-3 mr-1" />
                Loading...
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <IconRefresh
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="">
            <div className="text-6xl font-bold text-primary">
              {data?.averageValue.toFixed(2) || "0.00"}
            </div>
          </div>
        )}
      </CardContent>
      {data && (
        <CardFooter className="">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconClock className="h-3 w-3" />
            Query time: {data.queryTime}ms
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
