import { getLyrics } from '../src/main/services/LyricService';
import { Platform } from '../src/main/enum/Platform';



describe('getLyrics', () => {
  it('当 track_identifier 为 null 时应返回 undefined', async () => {
      // @ts-ignore 忽略类型检查
      const result = await getLyrics(
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: '123456',
        });

      console.log(result);
    },
  );
});
