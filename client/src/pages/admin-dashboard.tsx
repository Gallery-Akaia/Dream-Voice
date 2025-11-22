import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveIndicator } from "@/components/live-indicator";
import { Music, Users, Radio as RadioIcon, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AudioTrack, RadioState } from "@shared/schema";

export default function AdminDashboard() {
  const { data: tracks, isLoading: tracksLoading } = useQuery<AudioTrack[]>({
    queryKey: ["/api/tracks"],
  });

  const { data: radioState, isLoading: stateLoading } = useQuery<RadioState>({
    queryKey: ["/api/radio/state"],
    refetchInterval: 5000,
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-purple-100 mt-2">
          Welcome to Radio New Power admin panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Radio Status
            </CardTitle>
            <RadioIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <LiveIndicator isLive={radioState?.isLive || false} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Current Listeners
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-300" />
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100" data-testid="text-listener-count">
                  {radioState?.listenerCount || 0}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                  Active connections
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 border-pink-200 dark:border-pink-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-900 dark:text-pink-100">
              Playlist Tracks
            </CardTitle>
            <Music className="h-4 w-4 text-pink-600 dark:text-pink-300" />
          </CardHeader>
          <CardContent>
            {tracksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-pink-900 dark:text-pink-100" data-testid="text-track-count">
                  {tracks?.length || 0}
                </div>
                <p className="text-xs text-pink-600 dark:text-pink-300 font-medium">
                  Songs in rotation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 border-amber-200 dark:border-amber-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Uptime
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100" data-testid="text-uptime">
              {formatUptime(radioState?.playbackPosition || 0)}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
              Continuous streaming
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-700">
        <CardHeader>
          <CardTitle className="text-purple-900 dark:text-purple-100">Quick Actions</CardTitle>
          <CardDescription>
            Manage your radio station
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Use the sidebar to navigate to Analytics, Playlist Manager, or Live Controls to manage your station.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
