import { TrackModel } from '@src/shared/types';
import { TrackCreationAttributes } from '@main/models/Track';

export default interface TrackRepository {
  findAll(): Promise<TrackModel[]>;

  findById(id: number): Promise<TrackModel | null>;

  create(creationAttributes: TrackCreationAttributes): Promise<TrackModel>;

  delete(id: number): Promise<number>;

  update(track: TrackModel): Promise<TrackModel>;

  findByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<TrackModel | null>;

  findOrCreate(creationAttributes: TrackCreationAttributes): Promise<TrackModel>;


}