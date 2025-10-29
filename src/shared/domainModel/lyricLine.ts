/**
 * LyricLine 接口：表示歌词中的一行，包含时间（毫秒）和文本
 */
export interface LyricLine {
  time: number;
  text: string;
}

// /**
//  * Lyric 接口：表示完整歌词，包含多行歌词
//  */
// export interface Lyric {
//   originLines: LyricLine[];
//   translationLines: LyricLine[];
//   pronunciationLines: LyricLine[];
// }
//

export class Lyric {
  originLines: LyricLine[];
  translationLines: LyricLine[];
  pronunciationLines: LyricLine[];

  /**
   * 构造函数，初始化歌词对象,默认为空歌词
   * @param originLines
   * @param translationLines
   * @param pronunciationLines
   */
  constructor(originLines: LyricLine[] = [], translationLines: LyricLine[] = [], pronunciationLines: LyricLine[] = []) {
    this.originLines = originLines;
    this.translationLines = translationLines;
    this.pronunciationLines = pronunciationLines;
  }


  /**
   * 判断歌词对象是否有效（至少包含一行歌词）
   */
  isValid(): boolean {
    return this.originLines.length > 0 || this.translationLines.length > 0 || this.pronunciationLines.length > 0;
  }
}

