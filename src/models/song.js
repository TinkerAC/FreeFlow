class Song {
    constructor({
                    id,
                    title,
                    artist,
                    album,
                    genre,
                    duration,
                    filePath,
                    coverArtPath,
                    releaseDate,
                    bitRate,
                    sampleRate,
                    lyrics,
                    rating,
                    playCount,
                    lastPlayed
                }) {
        this.id = id;
        this.title = title;
        this.artist = artist;
        this.album = album;
        this.genre = genre;
        this.duration = duration;
        this.filePath = filePath;
        this.coverArtPath = coverArtPath;
        this.releaseDate = releaseDate;
        this.bitRate = bitRate;
        this.sampleRate = sampleRate;
        this.lyrics = lyrics;
        this.rating = rating;
        this.playCount = playCount;
        this.lastPlayed = lastPlayed;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            album: this.album,
            genre: this.genre,
            duration: this.duration,
            filePath: this.filePath,
            coverArtPath: this.coverArtPath,
            releaseDate: this.releaseDate,
            bitRate: this.bitRate,
            sampleRate: this.sampleRate,
            lyrics: this.lyrics,
            rating: this.rating,
            playCount: this.playCount,
            lastPlayed: this.lastPlayed,
        };
    }
}


