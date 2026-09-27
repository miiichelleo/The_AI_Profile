# Profile API

GitHub Pages cannot access Ollama on a visitor's computer. Run `server.js` on a separate host that can reach Ollama locally.

## Local development

1. Start Ollama and make sure `granite4.1:3b` is installed.
2. Run:

```sh
npm start
```

The API listens at `http://localhost:8787/api/profile` and proxies requests to `http://127.0.0.1:11434/api/generate`.

## Deployment

Deploy this server to a host with Node 18+ and Ollama installed. Set:

- `PORT`: API port, default `8787`
- `OLLAMA_URL`: optional Ollama URL, default `http://127.0.0.1:11434/api/generate`
- `OLLAMA_MODEL`: optional model, default `granite4.1:3b`
- `CORS_ORIGIN`: GitHub Pages origin, for example `https://your-user.github.io`
- `TLS_KEY_PATH`: path to the HTTPS private key
- `TLS_CERT_PATH`: path to the HTTPS certificate

When both TLS paths are present, the server listens over HTTPS. GitHub Pages must call an HTTPS API because browsers block insecure HTTP requests from an HTTPS page.

After deployment, replace `OLLAMA_CONFIG.remoteEndpoint` in `script.js` with:

```js
remoteEndpoint: "https://your-api-domain.example/api/profile"
```

The browser sends only interaction metrics. The backend owns the Ollama prompt and model connection.
