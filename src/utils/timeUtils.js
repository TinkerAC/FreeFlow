export function formatTime(seconds) {
    seconds = Math.round(seconds);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;//返回秒数格式化后的时间字符串
}

export function timeAgo(isoTimestamp) {
    const now = new Date();
    const timestamp = new Date(isoTimestamp);
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    if (diffInSeconds < 10) {
        return "刚刚";
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
    const yearTimestamp = timestamp.getFullYear();
    const monthTimestamp = timestamp.getMonth();

    // 计算总的月份差异
    const diffInMonths = (yearNow - yearTimestamp) * 12 + (monthNow - monthTimestamp);

    if (diffInMonths < 12) {
        return `${diffInMonths}个月前`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}年前`;
}




