# Audio folder for /creta

1. Copy your audio files (mp3, m4a, ogg, wav) into this folder.
2. List them in `playlist.json`:

```json
{
  "tracks": [
    { "title": "My song", "artist": "Artist name", "file": "my-song.mp3" },
    { "title": "Another song", "file": "another-song.m4a", "cover": "another-cover.jpg" }
  ]
}
```

`file` and `cover` are file names inside this folder. `artist` and `cover` are optional.
