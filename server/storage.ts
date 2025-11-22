import { type User, type InsertUser, type AudioTrack, type InsertAudioTrack, type RadioState } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllTracks(): Promise<AudioTrack[]>;
  getTrack(id: string): Promise<AudioTrack | undefined>;
  createTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  deleteTrack(id: string): Promise<void>;
  updateTrackOrder(trackId: string, newOrder: number): Promise<void>;
  
  getRadioState(): RadioState;
  updateRadioState(state: Partial<RadioState>): void;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tracks: Map<string, AudioTrack>;
  private radioState: RadioState;

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
    const track: AudioTrack = { ...insertTrack, id };
    this.tracks.set(id, track);
    return track;
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
}

export const storage = new MemStorage();
