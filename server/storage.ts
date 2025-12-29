import { users, audioTracks, type User, type InsertUser, type AudioTrack, type InsertAudioTrack, type RadioState, type ChatMessage, type ListenerAnalytics, type StreamConfig } from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

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
  
  getRadioState(): Promise<RadioState>;
  updateRadioState(state: Partial<RadioState>): Promise<void>;

  addChatMessage(message: ChatMessage): Promise<void>;
  getChatMessages(limit: number): Promise<ChatMessage[]>;
  
  recordListenerAnalytics(count: number): Promise<void>;
  getListenerAnalytics(minutesBack: number): Promise<ListenerAnalytics[]>;
  
  getStreamConfig(): Promise<StreamConfig>;
  updateStreamConfig(config: Partial<StreamConfig>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private radioState: RadioState;
  private chatMessages: ChatMessage[] = [];
  private listenerAnalytics: ListenerAnalytics[] = [];
  private streamConfig: StreamConfig;

  constructor() {
    this.radioState = {
      currentTrackId: null,
      playbackPosition: 0,
      isLive: false,
      backgroundVolume: 30,
      listenerCount: 0,
    };
    this.streamConfig = {
      streamUrl: "",
      isEnabled: false,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    return await db.select().from(audioTracks).orderBy(asc(audioTracks.order));
  }

  async getTrack(id: string): Promise<AudioTrack | undefined> {
    const [track] = await db.select().from(audioTracks).where(eq(audioTracks.id, id));
    return track;
  }

  async createTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const [track] = await db.insert(audioTracks).values(insertTrack).returning();
    return track;
  }

  async updateTrack(id: string, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    const [track] = await db
      .update(audioTracks)
      .set(updates)
      .where(eq(audioTracks.id, id))
      .returning();
    return track;
  }

  async deleteTrack(id: string): Promise<void> {
    await db.delete(audioTracks).where(eq(audioTracks.id, id));
  }

  async updateTrackOrder(trackId: string, newOrder: number): Promise<void> {
    await db
      .update(audioTracks)
      .set({ order: newOrder })
      .where(eq(audioTracks.id, trackId));
  }

  async getRadioState(): Promise<RadioState> {
    return { ...this.radioState };
  }

  async updateRadioState(state: Partial<RadioState>): Promise<void> {
    this.radioState = { ...this.radioState, ...state };
  }

  async addChatMessage(message: ChatMessage): Promise<void> {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
  }

  async getChatMessages(limit: number): Promise<ChatMessage[]> {
    return this.chatMessages.slice(-limit);
  }

  async recordListenerAnalytics(count: number): Promise<void> {
    this.listenerAnalytics.push({
      timestamp: Date.now(),
      listenerCount: count,
    });
    if (this.listenerAnalytics.length > 1440) {
      this.listenerAnalytics = this.listenerAnalytics.slice(-1440);
    }
  }

  async getListenerAnalytics(minutesBack: number): Promise<ListenerAnalytics[]> {
    const cutoff = Date.now() - minutesBack * 60 * 1000;
    return this.listenerAnalytics.filter(a => a.timestamp >= cutoff);
  }

  async getStreamConfig(): Promise<StreamConfig> {
    return { ...this.streamConfig };
  }

  async updateStreamConfig(config: Partial<StreamConfig>): Promise<void> {
    this.streamConfig = { ...this.streamConfig, ...config };
  }
}

export const storage = new DatabaseStorage();
