function formatTime(seconds) {
    seconds = Math.round(seconds);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;//返回秒数格式化后的时间字符串
}

export {formatTime};