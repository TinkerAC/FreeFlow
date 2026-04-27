import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMethods, selectRepresentativeCases, summarizeLatency, summarizeMethods, summarizeQueryCategories, validateFullRankingParity } from './search-ranking/evaluation.js';
import { writeExperimentOutputs } from './search-ranking/reporting.js';
import { SeedLibrary } from './search-ranking/seed-library.js';
import { buildQueries, buildSimulationCorpus, extractSourceStats, validateInputs } from './search-ranking/simulation.js';

/**
 * 这是搜索排序实验的唯一入口。
 * 它只负责串联数据准备、方法评估与报表输出，具体实现都拆到子模块中。
 */
function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, '../../../..');
  const seedLibrary = new SeedLibrary(repoRoot);

  const sourceStats = extractSourceStats(seedLibrary);
  const corpus = buildSimulationCorpus(seedLibrary);
  const queries = buildQueries(corpus.groupsByKey);
  const methods = buildMethods(corpus.records);

  validateInputs(corpus.records, queries);
  validateFullRankingParity(corpus.records, queries);

  const methodSummary = summarizeMethods(methods, queries);
  const latencySummary = summarizeLatency(corpus.records);
  const categorySummary = summarizeQueryCategories(queries);
  const representativeCases = selectRepresentativeCases(corpus.records, queries);

  const summaryMarkdown = writeExperimentOutputs({
    repoRoot,
    sourceStats,
    corpus,
    methodSummary,
    latencySummary,
    categorySummary,
    representativeCases,
  });

  console.log(summaryMarkdown);
}

main();
