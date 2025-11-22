import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  timestamp: number;
  listenerCount: number;
}

export default function AdminAnalytics() {
  const { data: analyticsData, isLoading } = useQuery<AnalyticsData[]>({
    queryKey: ["/api/analytics"],
    refetchInterval: 5000,
  });

  const chartData = (analyticsData || []).map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    listeners: point.listenerCount,
  }));

  const currentListeners = analyticsData && analyticsData.length > 0 
    ? analyticsData[analyticsData.length - 1].listenerCount 
    : 0;

  const peakListeners = analyticsData 
    ? Math.max(...analyticsData.map(a => a.listenerCount), 0)
    : 0;

  const avgListeners = analyticsData && analyticsData.length > 0
    ? Math.round(analyticsData.reduce((sum, a) => sum + a.listenerCount, 0) / analyticsData.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-analytics-title">
          Listener Analytics
        </h1>
        <p className="text-muted-foreground">
          Real-time monitoring of your radio station's audience
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Listeners
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-current-listeners">
                  {currentListeners}
                </div>
                <p className="text-xs text-muted-foreground">
                  Now listening
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peak Listeners
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-peak-listeners">
                  {peakListeners}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last hour
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Listeners
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-avg-listeners">
                  {avgListeners}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average in period
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listener Trend</CardTitle>
          <CardDescription>
            Last hour of listener activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || chartData.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="listeners" stroke="#3b82f6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
