import { TrackRecord } from '@main/database/record/TrackRecord';

export interface TrackDataSource {

  findAll(): Promise<TrackRecord[]>;

  findById(id: number): Promise<TrackRecord | null>;


  findByIds(ids: number[]): Promise<TrackRecord[]>;



  create(trackModel: TrackRecord): Promise<TrackRecord>;

  delete(id: number): Promise<number>;

  update(track: TrackRecord): Promise<TrackRecord>;

  findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<TrackRecord | null>;

  findOrCreate(trackModel: TrackRecord): Promise<TrackRecord>;

  bindLocalFileToTrack(trackId: number, fileName: string): Promise<TrackRecord>;

  findLocalFilePathByPlatformAndPlatformUniqueId(
    platform: string,platformUniqueId: string
  ): Promise<string | null>;
}