import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export default interface TrackRepository {
  findAll(): Promise<TrackEntity[]>;

  findById(id: number): Promise<TrackEntity | null>;

  create(trackModel: TrackEntity): Promise<TrackEntity>;

  delete(id: number): Promise<number>;

  update(track: TrackEntity): Promise<TrackEntity>;

  findByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<TrackEntity | null>;

  findOrCreate(trackModel: TrackEntity): Promise<TrackEntity>;


}