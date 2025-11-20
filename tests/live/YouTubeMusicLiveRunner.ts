import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { ConfigService } from '@main/core/configService';
import { testLogger } from '../logger';

const [, , keywordArg] = process.argv;
const keyword = keywordArg ?? 'lofi hip hop';

(async () => {
  try {
    const configStub = {
      get: (key: string) => {
        if (key === 'services.youtubeMusic') return {};
        return undefined;
      },
    } as unknown as ConfigService;

    const provider = new YouTubeMusic(configStub, testLogger);
    const tracks = await provider.searchTrack(keyword);
    const fusion = await provider.search(keyword);

    const payload = {
      keyword,
      trackCount: tracks.length,
      firstTrack: tracks[0]
        ? {
          id: tracks[0].platform_unique_id,
          title: tracks[0].title,
          platform: tracks[0].platform,
        }
        : null,
      playlistCount: fusion.playlist_result.length,
    };

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
