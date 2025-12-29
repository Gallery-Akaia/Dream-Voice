import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  AudioTrack, 
  InsertAudioTrack, 
  insertAudioTrackSchema 
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
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
import { Upload, Trash2, Music, GripVertical, Loader2, CheckCircle2, AlertCircle, Play, Pause, Settings2, FileAudio, Plus } from "lucide-react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function AdminPlaylist() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    
    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    console.log("[FFmpeg] Loading core...");
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    console.log("[FFmpeg] Core loaded successfully");
    return ffmpeg;
  };

  const extractAudioLocally = async (file: File) => {
    console.log(`[Processing] Starting extraction for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const ffmpeg = await loadFFmpeg();
    const inputName = "input_" + Date.now() + file.name.substring(file.name.lastIndexOf("."));
    const outputName = "output_" + Date.now() + ".mp3";
    
    console.log("[FFmpeg] Writing input file to virtual FS...");
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    
    ffmpeg.on("log", ({ message }) => {
      if (message.includes("size=") || message.includes("time=")) {
        console.log(`[FFmpeg Log] ${message}`);
      }
    });

    console.log("[FFmpeg] Executing conversion...");
    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-ar", "22050",
      "-ac", "1",
      "-b:a", "64k",
      "-threads", "0",
      outputName
    ]);
    
    console.log("[FFmpeg] Reading output file...");
    const data = await ffmpeg.readFile(outputName);
    
    console.log("[Processing] Extraction complete. Cleaning up virtual FS...");
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (e) {
      console.warn("[Processing] Cleanup warning:", e);
    }
    
    const audioFile = new File([data], file.name.replace(/\.[^/.]+$/, ".mp3"), { type: "audio/mpeg" });
    console.log(`[Processing] Final audio size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`);
    return audioFile;
  };

  const { data: tracks = [], isLoading } = useQuery<AudioTrack[]>({
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audio_tracks',
        },
        (payload) => {
          console.log('Realtime change received:', payload);
          queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    
    return new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      };
      audio.src = objectUrl;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent multiple triggers
    if (isUploading) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear input immediately to prevent double-upload of same file
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Basic validation
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    if (!isAudio && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio or video file",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(5);

      const isVideo = file.type.startsWith('video/');
      let fileToUpload = file;
      let duration = 0;

      if (isVideo) {
        toast({
          title: "Processing Video",
          description: "Extracting audio locally for instant upload...",
        });
        
        try {
          fileToUpload = await extractAudioLocally(file);
          // Get duration locally after conversion
          duration = await getAudioDuration(fileToUpload);
        } catch (ffmpegErr) {
          console.error("FFmpeg extraction failed:", ffmpegErr);
          toast({
            title: "Processing Failed",
            description: "Falling back to direct video upload...",
            variant: "destructive",
          });
          fileToUpload = file;
          duration = await getAudioDuration(file);
        }
      } else {
        duration = await getAudioDuration(file);
      }

      setUploadProgress(60);

      // 1. Upload to Supabase Storage with better error handling and progress tracking
      console.log("[Supabase] Starting upload to storage...");
      console.time("SupabaseUpload");
      const fileExt = isVideo ? 'mp3' : file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type,
        });

      if (uploadError) {
        console.error("[Supabase] Upload failed:", uploadError);
        console.timeEnd("SupabaseUpload");
        throw uploadError;
      }
      console.timeEnd("SupabaseUpload");
      console.log("[Supabase] Upload successful");
      setUploadProgress(60);

      // 2. Get Public URL
      console.log("[Supabase] Fetching public URL...");
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);
      console.log("[Supabase] Public URL retrieved:", publicUrl);

      // 3. Save to Database via API
      const newTrack = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        duration: Math.ceil(duration) || 180, 
        fileUrl: publicUrl,
        order: tracks.length,
        uploadStatus: "ready"
      };

      console.log("[Database] Saving track info:", newTrack);
      await apiRequest("POST", "/api/tracks/fast-supabase", newTrack);
      console.log("[Database] Save successful");
      
      setUploadProgress(100);
      toast({
        title: "Upload successful",
        description: `${file.name} has been added to the playlist`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-playlist-title">
            Playlist Manager
          </h1>
          <p className="text-muted-foreground mt-1">Manage your radio station's music library</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-upload-track"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {uploadProgress}%
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Track
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audio Library</CardTitle>
          <CardDescription>
            {tracks.length} tracks in your library. Click play to switch the current broadcast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Music className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <h3 className="mt-4 text-lg font-medium">No tracks yet</h3>
              <p className="text-muted-foreground">Upload your first audio or video file to get started</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.map((track) => (
                    <TableRow key={track.id} className="group">
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-4 w-4 text-primary" />
                          {track.title}
                        </div>
                      </TableCell>
                      <TableCell>{track.artist || "Unknown"}</TableCell>
                      <TableCell>
                        {formatDuration(track.duration)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={track.uploadStatus === "ready" ? "default" : "secondary"}>
                          {track.uploadStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => playTrackMutation.mutate(track.id)}
                            disabled={track.uploadStatus !== "ready" || playTrackMutation.isPending}
                            data-testid={`button-play-${track.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this track?")) {
                                deleteMutation.mutate(track.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${track.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
