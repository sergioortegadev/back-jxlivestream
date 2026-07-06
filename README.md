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

TURSO_CONNECTION_URL=
TURSO_AUTH_TOKEN=

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
---

### Comportamiento respecto a la conexión con DB para estadísticas:

#### Analytics es "best-effort" - intenta guardar pero si falla, sigue funcionando.


✅ BD disponible → guarda todo normalmente

❌ BD no disponible → loguea error, sigue funcionando, endpoints retornan vacíos o datos en memoria

❌ BD se recupera → intenta conectar nuevamente en próxima operación


---

## Desarrollado por sergioortegadev
