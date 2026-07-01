const config = {
  rtmp: {
    port: Number(process.env.RTMP_PORT) || 1935,
    chunk_size: 4000,
  },

  http: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    mediaroot: './media',
    allow_origin: '*', // ⚠️ Change this in prod ⚠️
    // Optional public URL for building external links (e.g. https://my-app.onrender.com)
    publicUrl: process.env.PUBLIC_URL || '',
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
