import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Trash2, Music, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AudioTrack } from "@shared/schema";

export default function AdminPlaylist() {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      toast({
        title: "Upload started",
        description: `Uploading ${files.length} file(s)...`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload audio files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      setTracks(tracks.filter((t) => t.id !== trackId));
      toast({
        title: "Track deleted",
        description: "Audio track has been removed from the playlist",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-playlist-title">
          Playlist Manager
        </h1>
        <p className="text-muted-foreground">
          Upload and manage your 24/7 radio playlist
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Audio Files</CardTitle>
          <CardDescription>
            Add MP3 files to your radio playlist. Drag and drop or click to browse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md border-border hover-elevate cursor-pointer transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  MP3, WAV, OGG (Max 50MB per file)
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                data-testid="input-file-upload"
              />
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playlist ({tracks.length} tracks)</CardTitle>
          <CardDescription>
            Manage the order and content of your playlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No tracks uploaded</h3>
              <p className="text-sm text-muted-foreground">
                Upload audio files to start building your playlist
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => (
                  <TableRow key={track.id} data-testid={`row-track-${track.id}`}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-medium">{track.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {track.artist || "Unknown Artist"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(track.duration)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTrack(track.id)}
                        data-testid={`button-delete-${track.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span className="sr-only">Delete track</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
