# Jxlivestream - Backend

Servidor de streaming de audio desarrollado en Node.js + Express.

Recibe una transmisión MP3 mediante `POST /publish` y la redistribuye en tiempo real a todos los clientes conectados mediante `GET /audio`.

## Características

- Streaming HTTP de audio MP3
- Buffer circular para nuevos oyentes
- Múltiples listeners simultáneos
- Autenticación del emisor mediante Bearer Token
- Endpoint de monitoreo (`/health`)
- Web estática de prueba incluida

## Endpoints

| Método | Ruta              | Descripción                        |
| ------ | ----------------- | ---------------------------------- |
| POST   | `/publish`        | Recibe el stream desde el Sender   |
| GET    | `/audio`          | Reproduce el stream                |
| GET    | `/health`         | Estado del servidor                |
| GET    | `/api/stream-url` | Devuelve la URL pública del stream |

## Variables de entorno

```env
PORT=8000
HOST=0.0.0.0
PUBLIC_URL=http://localhost:8000

PUBLISH_TOKEN=xxxxxxxxxxxxxxxx
```

## Ejecutar

```bash
npm install
npm run dev
```

Abrir:

```
http://localhost:8000
```

## Desarrollado por sergioortegadev
