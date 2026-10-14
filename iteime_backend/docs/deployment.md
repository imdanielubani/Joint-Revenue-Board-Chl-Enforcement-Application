<!-- Part of the iteime_backend docs; see ../README.md. -->

# Environments and deployment

There is one image for every deployment; they differ only in their
settings.

|                        | Development                   | Staging                                        | Production                                                   |
| ---------------------- | ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Where                  | This computer (`npm run dev`) | A server, for testers                          | A server, for officers                                       |
| `APP_ENV` / `NODE_ENV` | `development` / `development` | `staging` / `production`                       | `production` / `production`                                  |
| Database               | Local `iteimedb`              | Its own, never production's                    | Its own                                                      |
| CHL                    | Sample data (`mock`)          | Sample data, then CHL's test (sandbox) address | The real CHL (`http`); the server refuses to start otherwise |
| Settings               | `.env`                        | `deploy/staging.env.example`                   | `deploy/production.env.example`                              |
| Mobile app             | `--flavor dev`                | `--flavor staging`                             | `--flavor prod`                                              |

The server checks these rules at start-up:

- Staging and production need `NODE_ENV=production`.
- Production needs `CHL_ADAPTER=http`.

`/health` and `/health/ready` include `environment`, so you can always see
which deployment answered.

**Image.** `Dockerfile` builds a small image that runs as a non-root user,
with production dependencies only and a health check.

```sh
docker build -t iteime-backend .
docker run --env-file deploy/staging.env -p 4000:4000 iteime-backend
```

To try the image with its own PostgreSQL on one machine, run
`docker compose up --build` (`compose.yaml`, set up like staging).

**Deploying, for staging or production:**

1. Create the database; managed databases usually need
   `?sslmode=require` in `DATABASE_URL`.
2. Fill in the settings from `deploy/<environment>.env.example`, in the
   hosting platform's secret settings. Real `deploy/*.env` files are never
   committed.
3. Put the server behind HTTPS (a load balancer or reverse proxy), and set
   `TRUST_PROXY` to the number of proxies in front (usually `1`).
4. Run the image. It migrates the database at start-up. With the image's
   automatic migration off, run `npm run migrate:prod` before starting.
5. Point the load balancer's health check at `/health/ready`, which answers
   503 while CHL or the database is down.
6. Give the mobile team the address, ending in `/api/v1`, for
   `config/staging.json` or `config/prod.json`.

Each deployment logs JSON to standard output, for the platform's log
collector.
