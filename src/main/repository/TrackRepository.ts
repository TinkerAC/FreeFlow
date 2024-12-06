import { Track } from '@main/models';
import { TrackModel } from '@src/shared/types';
import { List } from 'postcss/lib/list';
import { TrackCreationAttributes } from '@main/models/Track';

export default interface TrackRepository {
  findAll(): Promise<TrackModel[]>;

  findById(id: number): Promise<TrackModel | null>;

  create(creationAttributes: TrackCreationAttributes): Promise<TrackModel>;

  delete(id: number): Promise<number>;

  update(track: TrackModel): Promise<TrackModel>;

  findByFilePath(filePath: string): Promise<TrackModel | null>;

  findByDataHref(dataHref: string): Promise<TrackModel | null>;




}