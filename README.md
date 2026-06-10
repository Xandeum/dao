### Using custom Swap API endpoints

Jupiter swap requests are proxied through the app server so API keys stay private. If you need a custom self-hosted or paid Jupiter base URL, configure it with a server-side env var:

```
JUPITER_SWAP_API_BASE_URL=https://api.jup.ag
```
