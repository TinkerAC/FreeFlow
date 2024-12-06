export function formatTime(seconds: number) {
  seconds = Math.round(seconds);
  const minutes: number = Math.floor(seconds / 60);
  const remainingSeconds: number = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;//返回秒数格式化后的时间字符串
}

export function timeAgo(date: Date): string {
  const now: Date = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 10) {
    return '刚刚';
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}天前`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}周前`;
  }

  // 改进的月份和年份计算
  const yearNow = now.getFullYear();
  const monthNow = now.getMonth();
  const yearDate = date.getFullYear();
  const monthDate = date.getMonth();

  // 计算总的月份差异
  const diffInMonths = (yearNow - yearDate) * 12 + (monthNow - monthDate);

  if (diffInMonths < 12) {
    return `${diffInMonths}个月前`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}年前`;
}

export function isSameUTCDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

// 获取当前时间戳的函数
export const getCurrentTimestamp = () => new Date().toISOString();




