import { type User, type InsertUser, type AudioTrack, type InsertAudioTrack, type RadioState, type ChatMessage, type ListenerAnalytics } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllTracks(): Promise<AudioTrack[]>;
  getTrack(id: string): Promise<AudioTrack | undefined>;
  createTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  updateTrack(id: string, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined>;
  deleteTrack(id: string): Promise<void>;
  updateTrackOrder(trackId: string, newOrder: number): Promise<void>;
  
  getRadioState(): RadioState;
  updateRadioState(state: Partial<RadioState>): void;

  addChatMessage(message: ChatMessage): void;
  getChatMessages(limit: number): ChatMessage[];
  
  recordListenerAnalytics(count: number): void;
  getListenerAnalytics(minutesBack: number): ListenerAnalytics[];
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tracks: Map<string, AudioTrack>;
  private radioState: RadioState;
  private chatMessages: ChatMessage[] = [];
  private listenerAnalytics: ListenerAnalytics[] = [];

  constructor() {
    this.users = new Map();
    this.tracks = new Map();
    this.radioState = {
      currentTrackId: null,
      playbackPosition: 0,
      isLive: false,
      backgroundVolume: 30,
      listenerCount: 0,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    return Array.from(this.tracks.values()).sort((a, b) => a.order - b.order);
  }

  async getTrack(id: string): Promise<AudioTrack | undefined> {
    return this.tracks.get(id);
  }

  async createTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const id = randomUUID();
    const track: AudioTrack = { ...insertTrack, id, uploadStatus: insertTrack.uploadStatus || "ready" };
    this.tracks.set(id, track);
    return track;
  }

  async updateTrack(id: string, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    const track = this.tracks.get(id);
    if (track) {
      const updatedTrack = { ...track, ...updates };
      this.tracks.set(id, updatedTrack);
      return updatedTrack;
    }
    return undefined;
  }

  async deleteTrack(id: string): Promise<void> {
    this.tracks.delete(id);
  }

  async updateTrackOrder(trackId: string, newOrder: number): Promise<void> {
    const track = this.tracks.get(trackId);
    if (track) {
      track.order = newOrder;
      this.tracks.set(trackId, track);
    }
  }

  getRadioState(): RadioState {
    return { ...this.radioState };
  }

  updateRadioState(state: Partial<RadioState>): void {
    this.radioState = { ...this.radioState, ...state };
  }

  addChatMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
  }

  getChatMessages(limit: number): ChatMessage[] {
    return this.chatMessages.slice(-limit);
  }

  recordListenerAnalytics(count: number): void {
    this.listenerAnalytics.push({
      timestamp: Date.now(),
      listenerCount: count,
    });
    if (this.listenerAnalytics.length > 1440) {
      this.listenerAnalytics = this.listenerAnalytics.slice(-1440);
    }
  }

  getListenerAnalytics(minutesBack: number): ListenerAnalytics[] {
    const cutoff = Date.now() - minutesBack * 60 * 1000;
    return this.listenerAnalytics.filter(a => a.timestamp >= cutoff);
  }
}

export const storage = new MemStorage();
