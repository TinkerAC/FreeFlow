import { TrackModel } from '@src/shared/domainModel/TrackModel';

export default interface TrackRepository {
  findAll(): Promise<TrackModel[]>;

  findById(id: number): Promise<TrackModel | null>;

  create(trackModel: TrackModel): Promise<TrackModel>;

  delete(id: number): Promise<number>;

  update(track: TrackModel): Promise<TrackModel>;

  findByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<TrackModel | null>;

  findOrCreate(trackModel: TrackModel): Promise<TrackModel>;


}