import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMethods, selectRepresentativeCases, summarizeLatency, summarizeMethods, summarizeQueryCategories, validateFullRankingParity } from './search-ranking/evaluation.js';
import { buildMusicbrainzBenchmark } from './search-ranking/musicbrainz-benchmark.js';
import { createProgressTask } from './search-ranking/progress.js';
import { MusicbrainzSource } from './search-ranking/musicbrainz-source.js';
import { writeExperimentOutputs } from './search-ranking/reporting.js';
import { validateInputs } from './search-ranking/simulation.js';

/**
 * 这是搜索排序实验的唯一入口。
 * 现在默认直接使用 MusicBrainz 样本库构建真实基准集，
 * 并在同一轮执行里完成指标评估与标注规模规划。
 */
async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, '../../../..');
  const source = new MusicbrainzSource();

  try {
    console.log('开始执行 MusicBrainz 搜索排序实验...');
    const buildProgress = createProgressTask('构建基准集', 6);
    const benchmark = await buildMusicbrainzBenchmark(source, buildProgress);
    const pipelineProgress = createProgressTask('实验主流程', 7);
    pipelineProgress.tick('基准集已就绪');
    const methods = buildMethods(benchmark.corpus.records);
    pipelineProgress.tick('排序方法已装载');

    validateInputs(benchmark.corpus.records, benchmark.queries);
    pipelineProgress.tick('输入校验完成');
    validateFullRankingParity(
      benchmark.corpus.records,
      benchmark.queries,
      createProgressTask('一致性校验', Math.min(16, benchmark.queries.length)),
    );
    pipelineProgress.tick('共享排序与正式排序一致');

    const methodSummary = summarizeMethods(
      methods,
      benchmark.queries,
      (label, total) => createProgressTask(label, total),
    );
    pipelineProgress.tick('方法指标计算完成');
    const latencySummary = summarizeLatency(
      benchmark.corpus.records,
      createProgressTask(
        '延迟采样',
        [Math.min(1_000, benchmark.corpus.records.length), Math.min(5_000, benchmark.corpus.records.length), benchmark.corpus.records.length]
          .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
          .length,
      ),
    );
    pipelineProgress.tick('延迟采样完成');
    const categorySummary = summarizeQueryCategories(benchmark.queries);
    const representativeCases = selectRepresentativeCases(benchmark.corpus.records, benchmark.queries);
    pipelineProgress.tick('分类统计与案例抽取完成');

    const summaryMarkdown = writeExperimentOutputs({
      repoRoot,
      sourceStats: benchmark.sourceStats,
      datasetProfile: benchmark.datasetProfile,
      scalePlan: benchmark.scalePlan,
      corpus: benchmark.corpus,
      queries: benchmark.queries,
      methodSummary,
      latencySummary,
      categorySummary,
      representativeCases,
    });
    pipelineProgress.done('报表输出完成');

    console.log(summaryMarkdown);
  } finally {
    await source.close();
  }
}

void main();
