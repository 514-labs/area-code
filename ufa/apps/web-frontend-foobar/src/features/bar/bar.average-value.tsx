import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { IconClock, IconRefresh } from "@tabler/icons-react";
import { NumericFormat } from "react-number-format";
import { GetBarsAverageValueResponse } from "@workspace/models/bar";

const fetchAverageValue = async (
  apiEndpoint: string
): Promise<GetBarsAverageValueResponse> => {
  const response = await fetch(apiEndpoint);

  if (!response.ok) throw new Error("Failed to fetch average value");
  return response.json();
};

export default function BarAverageValue({
  title,
  description,
  apiEndpoint,
  disableCache = false,
}: {
  title: string;
  description: string;
  apiEndpoint: string;
  disableCache?: boolean;
}) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
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
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        ) : (
          <div className="">
            <div className="text-6xl font-bold text-primary">
              {data?.averageValue?.toFixed(2) || "0.00"}
            </div>
          </div>
        )}
      </CardContent>
      {data && (
        <CardFooter className="">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconClock className="h-3 w-3" />
            Query time:{" "}
            <NumericFormat
              value={Math.round(data.queryTime || 0)}
              displayType="text"
              thousandSeparator=","
            />
            ms
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
