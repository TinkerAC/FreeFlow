
import { Innertube, UniversalCache } from 'youtubei.js';

(async () => {
  try {
    console.log('Creating Innertube client...');
    const client = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      gl: 'US',
      hl: 'en',
    } as any);

    const keyword = 'Shape of You';
    console.log(`Searching for "${keyword}"...`);

    // Search without filters first
    const searchResponse: any = await client.music.search(keyword);

    console.log('Search Response Keys:', Object.keys(searchResponse));

    if (searchResponse.contents) {
      console.log('Contents is array:', Array.isArray(searchResponse.contents));
      if (Array.isArray(searchResponse.contents)) {
        searchResponse.contents.forEach((item: any, index: number) => {
          console.log(`Item ${index}: type=${item.type}, constructor=${item.constructor?.name}`);
          if (item.type === 'MusicShelf' || item.constructor?.name === 'MusicShelf') {
            console.log(`  Shelf Title: ${item.title?.text ?? item.title}`);
            if (item.contents && Array.isArray(item.contents)) {
              console.log(`  Shelf Items: ${item.contents.length}`);
              item.contents.forEach((subItem: any, subIndex: number) => {
                console.log(`    SubItem ${subIndex}: type=${subItem.type}, item_type=${subItem.item_type}, title=${subItem.title}`);
              });
            }
          }
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
})();
