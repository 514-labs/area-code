import React from "react";
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
import { IconCalculator, IconClock, IconRefresh } from "@tabler/icons-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081/api";

interface AverageScoreResponse {
  averageScore: number;
  queryTime: number;
  count: number;
}

// API function to fetch average score
const fetchAverageScore = async (): Promise<AverageScoreResponse> => {
  const response = await fetch(`${API_BASE}/foo/average-score`);
  if (!response.ok) throw new Error("Failed to fetch average score");
  return response.json();
};

export function FooAverageScore() {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["foo-average-score"],
    queryFn: fetchAverageScore,
    // Removed auto-refresh
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
              <IconCalculator className="h-5 w-5" />
              <CardTitle>Average Score</CardTitle>
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
          <CardDescription>Failed to load average score</CardDescription>
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
            <CardTitle>Average Score</CardTitle>
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
              {data?.averageScore.toFixed(2) || "0.00"}
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

export default FooAverageScore;
