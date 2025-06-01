import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export default interface TrackRepository {
  findAll(): Promise<TrackEntity[]>;

  findById(id: number): Promise<TrackEntity | null>;

  create(trackModel: TrackEntity): Promise<TrackEntity>;

  delete(id: number): Promise<number>;

  update(track: TrackEntity): Promise<TrackEntity>;

  findByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<TrackEntity | null>;

  findOrCreate(trackModel: TrackEntity): Promise<TrackEntity>;

  /**
   *  用于将下载后的本地文件绑定到数据库中的曲目
   * @param trackId
   * @param fileName 在musicDir 下的相对路径(文件名)
   */
  bindLocalFileToTrack(trackId: number, fileName: string): Promise<TrackEntity>;


  findLocalFilePathByPlatformAndPlatformUniqueId(
    platform: string, platformUniqueId: string,
  ): Promise<string | null>;


  increasePlayCount(track: TrackEntity): Promise<TrackEntity>;

}