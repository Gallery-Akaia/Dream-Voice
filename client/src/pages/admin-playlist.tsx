import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Music, GripVertical, Loader2, CheckCircle2, AlertCircle, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AudioTrack, RadioState } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "extracting" | "uploading" | "complete" | "error";
  error?: string;
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    
    audio.addEventListener("loadedmetadata", () => {
      const duration = Math.floor(audio.duration);
      URL.revokeObjectURL(url);
      resolve(duration > 0 ? duration : 180);
    });
    
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio"));
    });
    
    audio.src = url;
  });
}

const CHUNK_SIZE = 512 * 1024;

async function uploadChunk(
  uploadId: string,
  chunk: Blob,
  chunkIndex: number
): Promise<{ received: number; total: number; progress: number }> {
  const formData = new FormData();
  formData.append("chunk", chunk);
  formData.append("chunkIndex", chunkIndex.toString());

  const response = await fetch(`/api/tracks/chunk/${uploadId}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload chunk");
  }

  return response.json();
}

async function uploadWithProgress(
  file: File,
  duration: number,
  onProgress: (progress: number) => void
): Promise<AudioTrack> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  if (totalChunks <= 1) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("audio", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      formData.append("duration", duration.toString());

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new Error("Invalid response"));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

      xhr.open("POST", "/api/tracks/fast");
      xhr.send(formData);
    });
  }

  const initResponse = await fetch("/api/tracks/chunk/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "audio/mpeg",
      totalChunks,
      title: file.name.replace(/\.[^/.]+$/, ""),
      duration,
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(error.error || "Failed to initialize upload");
  }

  const { uploadId } = await initResponse.json();

  let uploadedChunks = 0;
  const concurrentUploads = 3;

  const chunks: { index: number; blob: Blob }[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push({ index: i, blob: file.slice(start, end) });
  }

  const uploadQueue = [...chunks];

  async function processQueue(): Promise<void> {
    while (uploadQueue.length > 0) {
      const chunk = uploadQueue.shift();
      if (!chunk) break;

      await uploadChunk(uploadId, chunk.blob, chunk.index);
      uploadedChunks++;
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      onProgress(progress);
    }
  }

  const workers = Array(Math.min(concurrentUploads, totalChunks))
    .fill(null)
    .map(() => processQueue());

  await Promise.all(workers);

  const completeResponse = await fetch(`/api/tracks/chunk/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.error || "Failed to complete upload");
  }

  return completeResponse.json();
}

export default function AdminPlaylist() {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { radioState } = useWebSocket();

  const { data: tracks, isLoading } = useQuery<AudioTrack[]>({
    queryKey: ["/api/tracks"],
  });

  const playTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      await apiRequest("POST", "/api/radio/play-track", { trackId });
    },
    onSuccess: () => {
      toast({
        title: "Now playing",
        description: "Track is now playing for all listeners",
      });
    },
    onError: () => {
      toast({
        title: "Failed to play track",
        description: "Could not start playback",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "playlist_updated" || data.type === "track_ready" || data.type === "track_upload_failed") {
          queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
        }
        if (data.type === "track_ready") {
          toast({
            title: "Track ready",
            description: "Your track is now ready to play",
          });
        }
        if (data.type === "track_upload_failed") {
          toast({
            title: "Upload failed",
            description: "Failed to save track to storage",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [toast]);

  const deleteMutation = useMutation({
    mutationFn: async (trackId: string) => {
      await apiRequest("DELETE", `/api/tracks/${trackId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({
        title: "Track deleted",
        description: "Audio track has been removed from the playlist",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete track",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);
    e.target.value = "";

    for (const file of filesToUpload) {
      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      setUploadingFiles((prev) => [
        ...prev,
        {
          id: uploadId,
          name: file.name,
          progress: 0,
          status: "extracting",
        },
      ]);

      try {
        let duration: number;
        try {
          duration = await getAudioDuration(file);
        } catch {
          duration = 180;
        }

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId ? { ...f, status: "uploading" as const, progress: 0 } : f
          )
        );

        await uploadWithProgress(file, duration, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === uploadId ? { ...f, progress } : f))
          );
        });

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId ? { ...f, status: "complete" as const, progress: 100 } : f
          )
        );

        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });

        toast({
          title: "Track added",
          description: `${file.name} has been added to the playlist`,
        });

        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        }, 2000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, status: "error" as const, error: errorMessage }
              : f
          )
        );

        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        });

        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        }, 5000);
      }
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    deleteMutation.mutate(trackId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isUploading = uploadingFiles.some(
    (f) => f.status === "extracting" || f.status === "uploading"
  );

  const getUploadStatusBadge = (status?: string | null) => {
    if (!status || status === "ready") return null;
    if (status === "uploading") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      );
    }
    if (status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-playlist-title">
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
            Add audio files to your playlist. Tracks appear instantly while uploading in the background.
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
                  MP3, WAV, OGG (Max 100MB per file)
                </p>
              </div>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                data-testid="input-file-upload"
              />
            </Label>

            {uploadingFiles.length > 0 && (
              <div className="space-y-3">
                {uploadingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`upload-progress-${file.id}`}
                  >
                    <div className="flex-shrink-0">
                      {file.status === "complete" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : file.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.status === "extracting" && (
                        <p className="text-xs text-muted-foreground">Analyzing audio...</p>
                      )}
                      {file.status === "uploading" && (
                        <div className="flex items-center gap-2">
                          <Progress value={file.progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">
                            {file.progress}%
                          </span>
                        </div>
                      )}
                      {file.status === "complete" && (
                        <p className="text-xs text-green-600 dark:text-green-400">Added to playlist</p>
                      )}
                      {file.status === "error" && (
                        <p className="text-xs text-destructive">{file.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playlist ({tracks?.length || 0} tracks)</CardTitle>
          <CardDescription>
            Manage the order and content of your playlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !tracks || tracks.length === 0 ? (
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
                  <TableHead className="w-12">Play</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => {
                  const isCurrentTrack = radioState.currentTrackId === track.id;
                  const canPlay = track.uploadStatus !== "uploading";
                  
                  return (
                    <TableRow 
                      key={track.id} 
                      data-testid={`row-track-${track.id}`}
                      className={`${track.uploadStatus === "uploading" ? "opacity-70" : ""} ${isCurrentTrack ? "bg-primary/10" : ""}`}
                    >
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={isCurrentTrack ? "default" : "ghost"}
                          size="icon"
                          onClick={() => playTrackMutation.mutate(track.id)}
                          disabled={!canPlay || playTrackMutation.isPending}
                          data-testid={`button-play-${track.id}`}
                        >
                          {isCurrentTrack ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          <span className="sr-only">Play track</span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {track.title}
                        {isCurrentTrack && (
                          <Badge variant="secondary" className="ml-2">
                            Now Playing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {track.artist || "Unknown Artist"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDuration(track.duration)}
                      </TableCell>
                      <TableCell>
                        {getUploadStatusBadge(track.uploadStatus)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTrack(track.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${track.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                          <span className="sr-only">Delete track</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
