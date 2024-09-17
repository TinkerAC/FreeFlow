export default async function getAudioSrc(track) {
    try {
        const filePath = track.file_path;
        const dataHref = track.data_href;

        if (filePath) {
            // 如果存在 file_path，则直接返回本地文件路径
            return filePath;
        } else if (dataHref) {
            // 如果存在 datahref，则使用代理服务器发送请求
            const proxyUrl = `http://localhost:3000/proxy?dataHref=${encodeURIComponent(dataHref)}`;

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', proxyUrl, true);
                xhr.responseType = 'blob';

                xhr.onload = function () {
                    if (xhr.status === 200 || xhr.status === 206) {
                        const blob = xhr.response;
                        const blobUrl = URL.createObjectURL(blob);
                        resolve(blobUrl); // 返回生成的 blob URL
                    } else {
                        reject(new Error(`Failed to load audio from datahref via proxy: ${xhr.status} ${xhr.statusText}`));
                    }
                };

                xhr.onerror = function () {
                    reject(new Error('Network error while loading audio via proxy.'));
                };

                xhr.send();
            });
        } else {
            throw new Error('No valid file path or datahref provided in the track object.');
        }
    } catch (error) {
        throw new Error(`Error loading audio: ${error.message}`);
    }
}

// 使用示例
// const track = {
//     file_path: '/path/to/local/audio-file.mp3', // 本地文件路径
//     // datahref: 'https://example.com/alternative-audio-file' // 备用网络文件路径
// };
//
// getAudioSrc(track)
//     .then(url => {
//         const audioElement = document.querySelector('audio');
//         audioElement.src = url; // 如果是本地文件路径或 blob URL，都会返回
//         audioElement.play();
//     })
//     .catch(error => {
//         console.error(error);
//     });
