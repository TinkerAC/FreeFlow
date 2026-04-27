export type ProgressTask = {
  tick(detail?: string): void;
  done(detail?: string): void;
};

function padRight(value: string, width: number) {
  if (value.length >= width) return value;
  return `${value}${' '.repeat(width - value.length)}`;
}

/**
 * 这是一个很轻量的命令行进度条实现。
 * 目标不是追求花哨效果，而是让长时间运行的离线实验能明确暴露当前阶段。
 */
export function createProgressTask(label: string, total: number): ProgressTask {
  const safeTotal = Math.max(1, total);
  const barWidth = 24;
  const isTty = Boolean(process.stdout.isTTY);
  const logEvery = Math.max(1, Math.ceil(safeTotal / 12));
  let current = 0;
  let finished = false;
  let lastLength = 0;

  function render(detail = '') {
    const ratio = Math.min(1, current / safeTotal);
    const filled = Math.round(ratio * barWidth);
    const bar = `${'#'.repeat(filled)}${'-'.repeat(Math.max(0, barWidth - filled))}`;
    const percent = `${Math.round(ratio * 100)}%`.padStart(4, ' ');
    const line = `${label} [${bar}] ${String(current).padStart(String(safeTotal).length, ' ')}/${safeTotal} ${percent}${detail ? ` ${detail}` : ''}`;

    if (isTty) {
      const padded = padRight(line, lastLength);
      process.stdout.write(`\r${padded}`);
      lastLength = Math.max(lastLength, line.length);
      return;
    }

    if (current === 0 || current === safeTotal || current % logEvery === 0) {
      console.log(line);
    }
  }

  render();

  return {
    tick(detail) {
      if (finished) return;
      current = Math.min(safeTotal, current + 1);
      render(detail);
      if (current >= safeTotal) {
        finished = true;
        if (isTty) process.stdout.write('\n');
      }
    },
    done(detail) {
      if (finished) return;
      current = safeTotal;
      finished = true;
      render(detail);
      if (isTty) process.stdout.write('\n');
    },
  };
}
