const config = {
  rtmp: {
    port: 1935,
    chunk_size: 4000,
  },

  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*', // ⚠️ Change this in prod ⚠️
  },

  ffmpeg: {
    path: '/usr/bin/ffmpeg',
  },

  stream: {
    app: 'jxlivestream',
    key: 'stream-en-directo', // rtmp://server/jxlivestream/stream-en-directo
    hls: {
      list_size: 5, // cantidad de chunks en el .m3u8
      time: 2, // duración de cada chunk en segundos
    },
  },
};

export default config;
