# Search Ranking Experiment

- Dataset source: MusicBrainz sample 2026-04-01
- Imported tracks: 837697
- Indexed resources: 6000
- Core benchmark groups: 48
- Core relevant records: 815
- Distractor records: 5185
- Query set size: 162
- Reference timestamp: 2026-04-22T12:00:00.000Z

## Retrieval Metrics

| 方法 | P@10 | MRR | nDCG@10 | 零结果率 | 平均延迟(ms) |
| --- | --- | --- | --- | --- | --- |
| SQL contains baseline | 0.1377 | 0.4681 | 0.4334 | 47.53% | 23.2932 |
| 仅文本打分 | 0.2105 | 0.6992 | 0.6014 | 10.49% | 278.6325 |
| 文本 + 身份字段 | 0.2179 | 0.7733 | 0.6755 | 3.70% | 284.6602 |
| 完整链上资源排序 | 0.1963 | 0.7253 | 0.6480 | 3.70% | 297.7463 |

## Cluster Layout

| 分组 | 艺术家 | 专辑 | 曲目数 |
| --- | --- | --- | --- |
| release_130163 | Various Artists | みんな大好き塊魂オリジナルサウンドトラック「塊は魂」 | 18 |
| release_150181 | Cage | Movies for the Blind | 18 |
| release_163733 | kid606 | kid606 and Friends, Volume 1 | 18 |
| release_207041 | 菅野よう子 | Ghost in the Shell: Stand Alone C… | 18 |
| release_420610 | Appleblim | Dubstep Allstars, Volume 06: Mixe… | 18 |
| release_759740 | Various Artists | Classic CD, Volume 56: Christmas … | 18 |
| release_999525 | Silvia Čápová | Piano Masterpieces | 18 |
| release_1202740 | 잠비나이 | 차연 | 9 |
| release_1236800 | Tschaikowsky; Wiene… | Im Herzen der Klassik 10: Tschaik… | 18 |
| release_1350314 | Maurice Ravel, Tcha… | The Rubinstein Collection, Volume… | 18 |
| release_1367361 | 澤野弘之 | キルラキル オリジナルサウンドトラック | 18 |
| release_1444410 | yoko kanno | 残響のテロル ORIGINAL SOUNDTRACK | 18 |
| release_1515866 | Various Artists | Accuphase: Special Sound Selectio… | 18 |
| release_1610922 | A$AP Rocky | At.Long.Last.A$AP | 18 |
| release_1807317 | Nancy Sinatra | Greatest Hits | 18 |
| release_1833799 | Various Artists | Treulich geführt... - Die schönst… | 18 |
| release_1864872 | Seatbelts | COWBOY BEBOP NO DISC オリジナルサウンドトラッ… | 18 |
| release_1973532 | Terry Nation narrat… | Doctor Who: Genesis of the Daleks | 18 |
| release_2032540 | Charles Dickens rea… | Oliver Twist | 9 |
| release_2221807 | Depeche Mode | Songs of Faith and Devotion | 18 |
| release_2229385 | Andrew Lloyd Webber | The Very Best of Andrew Lloyd Web… | 18 |
| release_2248538 | Grateful Dead | Dave’s Picks, Volume 24: Berkeley… | 18 |
| release_2296233 | Various Artists | The Instruments of Classical Musi… | 9 |
| release_2428903 | Rimskij-Korsakov, M… | Rimskij-Korsakov: «Sheherazade» /… | 18 |
| release_3434137 | The Weeknd | Starboy | 18 |
| release_3673175 | Avril Lavigne | Love Sux (deluxe) | 18 |
| release_4576765 | Various Artists | High Endition Volume 14 - Classic… | 18 |
| release_4651320 | Albéniz, Beethoven,… | The Vienna Recital | 18 |
| release_5275945 | HAIM | I quit | 18 |
| release_5387385 | The Firm | The Album | 18 |
| release_237794 | At the Close of Eve… | The Silja Symphony | 17 |
| release_274949 | Tchaikovsky; Bernst… | Symphonies nos. 5 & 6 "Pathetique… | 17 |
| release_785597 | Charles Gross | A Family Thing | 17 |
| release_1350800 | Lecrae | Church Clothes, Volume 2 | 17 |
| release_1462262 | Various Artists | Essential Classics - Highlights F… | 17 |
| release_1533258 | La Novem | France : Chants à voix égales du … | 17 |
| release_1725927 | The Hit Crew | Drew’s Famous Party Music (Basket… | 17 |
| release_1783619 | Volbeat | Seal the Deal & Let’s Boogie | 17 |
| release_2408603 | Various Artists | A New World: Intimate Music From … | 17 |
| release_2411963 | Various Artists | The Triumph of Tchaikovsky | 17 |
| release_2790150 | Dua Lipa & The Bles… | Club Future Nostalgia | 17 |
| release_3054290 | The Killers | Battle Born | 17 |
| release_3527003 | Melody Gardot | Live in Europe | 17 |
| release_4249861 | Melody Gardot | My One and Only Thrill | 17 |
| release_27583 | Limp Bizkit | Results May Vary | 16 |
| release_113560 | Nine Inch Nails | Hole in Your Head | 16 |
| release_162129 | Phish | The White Tape | 16 |
| release_216783 | Ennio Morricone | Cinema Paradiso | 16 |

## Latency by Candidate Count

| 候选集规模 | 平均延迟(ms) | P95延迟(ms) |
| --- | --- | --- |
| 1000 | 46.0000 | 83.9275 |
| 5000 | 203.5518 | 367.1870 |
| 6000 | 252.5022 | 449.4013 |

## Annotation Plan

| 类别 | 标注方式 | 查询数 | 标注深度 | 预计判断条目 |
| --- | --- | --- | --- | --- |
| address | spot_check | 3 | 5 | 15 |
| album | manual | 24 | 10 | 240 |
| artist | manual | 18 | 10 | 180 |
| artist_alias | manual | 10 | 10 | 100 |
| cid | spot_check | 3 | 5 | 15 |
| compact | manual | 10 | 10 | 100 |
| fullwidth | manual | 4 | 10 | 40 |
| multi_term | manual | 18 | 10 | 180 |
| release_alias | manual | 10 | 10 | 100 |
| resource_key | spot_check | 3 | 5 | 15 |
| title_artist | manual | 18 | 10 | 180 |
| title_exact | manual | 24 | 10 | 240 |
| token_id | spot_check | 3 | 5 | 15 |
| tx_hash | spot_check | 2 | 5 | 10 |
| typo | manual | 12 | 10 | 120 |

- Manual queries: 148
- Spot-check queries: 14
- Estimated manual judgements: 1480
- Estimated total judgements: 1550

## Representative Cases

### q123 Introductiox

1. Introduction (21.667) - 文本相似度 92% / 购买/评论热度较高
2. Introduction (21.600) - 文本相似度 92% / 购买/评论热度较高
3. Introduction (21.531) - 文本相似度 92% / 购买/评论热度较高

### q135 MorningDips

1. Morning Dips (98.000) - IPFS CID 包含关键词 / 标题精确匹配 / 文本相似度 100% / 购买/评论热度较高

### q158 chain:11155111:0x0000000000000000000000000000000000db5da7:14576359

1. ヒューストン (176.793) - 链上资源键精确匹配 / 音乐合约地址精确匹配 / 购买/评论热度较高
2. Violin Concerto no. 1 in A minor, op. 77: III. Passacaglia: Andante (32.558) - 音乐合约地址局部匹配 / 购买/评论热度较高
3. A Midsummer Night's Dream: Overture, op. 21 (32.463) - 音乐合约地址局部匹配 / 购买/评论热度较高
