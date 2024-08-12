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


    seekTo(seconds) {
        this.audioRef.current.currentTime = seconds;
    }

    playPrevious() {
        if (this.playQueue.indexList.length === 0) {
            return;
        }

        if (this.playQueue.currentIndex > 0) {
            this.playQueue.currentIndex--;
        } else {
            this.playQueue.currentIndex = this.playQueue.indexList.length - 1; // 循环播放
        }

        this.audioRef.current.src = `file://${this.getCurrentFilePath()}`;

        this.audioRef.current.addEventListener('canplaythrough', () => {
            this.play();
        }, {once: true});  // 仅监听一次事件
    }


    setVolume(volume) {
        this.audioRef.current.volume = volume;
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


    getCurrentIndex() {
        return this.playQueue.currentIndex;
    }


    toJSON() {
        return {
            currentTrack: this.getCurrentTrack(),  // 使用 getCurrentTrack 获取当前曲目
            mode: this.mode,
            playQueue: this.playQueue.toJSON()
        };
    }

    exportUIState() {
        return {
            file_path: this.getCurrentFilePath(),
        };
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
