import fs from 'fs';

class PlayQueue {
    constructor() {
        this.queue = [];
        this.indexList = [];
        this.currentIndex = 0;
    }


    toJSON() {
        return {
            queue: this.queue,
            indexList: this.indexList,
            currentIndex: this.currentIndex
        };
    }

    fromJSON(json) {
        this.queue = json.queue;
        this.indexList = json.indexList;
        this.currentIndex = json.currentIndex;
    }

    getCurrentTrack() {
        return this.queue[this.indexList[this.currentIndex]] || {file_path: ''};
    }


    length() {
        return this.queue.length;
    }
}

class Player {
    constructor(audioRef) {
        this.playQueue = new PlayQueue();
        this.mode = 'loop';
        this.audioRef = audioRef;
        this.isPlaying = false;  // 初始化 isPlaying 状态
    }


    fromJSON(json) {
        this.playQueue = new PlayQueue();
        this.playQueue.fromJSON(json.playQueue);
        this.mode = json.mode;
    }

    switchPlayMode(mode) {
        switch (mode) {
            case 'loop':
                this.mode = 'loop';
                this.playQueue.indexList = Array.from(Array(this.playQueue.length()).keys());
                break;
            case 'shuffle':
                this.mode = 'shuffle';
                this.playQueue.indexList = Array.from(Array(this.playQueue.length()).keys()).sort(() => Math.random() - 0.5);
                break;
            case 'repeat':
                this.mode = 'repeat';
                this.playQueue.indexList = [this.playQueue.currentIndex];
                break;
            default:
                console.error('Unknown mode:', mode);
        }
    }

    previousFilePath() {
        if (this.playQueue.indexList.length === 0) {
            return "";
        }

        if (this.playQueue.currentIndex > 0) {
            this.playQueue.currentIndex--;
        } else {
            this.playQueue.currentIndex = this.playQueue.indexList.length - 1; // 循环播放
        }

        return this.getCurrentFilePath();//返回上一首歌曲的路径
    }


    addTracksToPlayQueue(tracks) {
        if (tracks.length === 0) {
            return;
        }

        tracks.forEach(track => {
            this.playQueue.queue.push(track);
            this.playQueue.indexList.push(this.playQueue.queue.length - 1);
        });
    }

    addTrackToNext(tracks) {
        if (tracks.length === 0) {
            return;
        }

        let insertPosition = this.playQueue.currentIndex + 1;

        tracks.forEach(track => {
            // 在队列中的插入位置插入track
            this.playQueue.queue.splice(insertPosition, 0, track);

            // 在indexList中添加新插入track的索引
            this.playQueue.indexList.push(insertPosition);

            // 更新插入位置以确保下一首插入的曲目紧跟着插入
            insertPosition++;
        });
    }


    replacePlayQueue(tracks) {
        this.playQueue.queue = tracks;
        this.playQueue.indexList = Array.from(Array(tracks.length).keys());
        this.switchPlayMode(this.mode);//更新indexList
        this.playQueue.currentIndex = 0;
    }


    nextFilePath() {
        if (this.playQueue.indexList.length === 0) {
            return "";
        }

        if (this.playQueue.currentIndex < this.playQueue.indexList.length - 1) {
            this.playQueue.currentIndex++;
        } else {
            this.playQueue.currentIndex = 0; // 循环播放
        }

        return this.getCurrentFilePath();//返回下一首歌曲的路径
    }


    getCurrentTrack() {
        return this.playQueue.getCurrentTrack();
    }

    getCurrentFilePath() {
        return this.getCurrentTrack().file_path;
    }

    getPlayQueue() {
        return this.playQueue;
    }

    getNextTracks() {
        const nextTracks = [];

        // 从当前播放的音轨的下一个开始遍历
        for (let i = this.playQueue.currentIndex + 1; i < this.playQueue.indexList.length; i++) {
            const nextTrack = this.playQueue.queue[this.playQueue.indexList[i]];
            if (nextTrack) {
                nextTracks.push(nextTrack);
            }
        }

        return nextTracks;
    }


}

function loadPlayer() {
    try {
        const playerData = fs.readFileSync('./data/playerState.json', 'utf-8');
        return JSON.parse(playerData);
    } catch (e) {
        console.error('Failed to load player state:', e);
        return null;  // 确保在失败时返回一个可处理的值
    }
}

export {Player, loadPlayer};
