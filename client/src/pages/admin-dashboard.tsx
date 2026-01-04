import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveIndicator } from "@/components/live-indicator";
import { Music, Users, Radio as RadioIcon, Clock, Settings2 } from "lucide-react";
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Status overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Radio Status
            </CardTitle>
            <RadioIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <LiveIndicator isLive={radioState?.isLive || false} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Listeners
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold" data-testid="text-listener-count">
                  {radioState?.listenerCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active connections
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Playlist Tracks
            </CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tracksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold" data-testid="text-track-count">
                  {tracks?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Songs in rotation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Uptime
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-uptime">
              {formatUptime(radioState?.playbackPosition || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Continuous streaming
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage your radio station
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate to Analytics, Playlist Manager, or Live Controls to manage your station.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
