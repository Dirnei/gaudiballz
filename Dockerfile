# One image, one process. Kestrel serves the API and the built client together, so there is
# no reverse proxy to configure and no second container to keep in step.

# ---------- client ----------
FROM node:24-alpine AS client
WORKDIR /client

# Copied first so a source-only change does not reinstall every dependency.
COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---------- server ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS server
WORKDIR /src

# Restore before the source arrives, for the same reason.
COPY global.json Directory.Build.props Directory.Packages.props gaudiballz.slnx ./
COPY src/Puzzle.Rules/Puzzle.Rules.csproj              src/Puzzle.Rules/
COPY src/Puzzle.Rules.Tests/Puzzle.Rules.Tests.csproj  src/Puzzle.Rules.Tests/
COPY src/Puzzle.Server/Puzzle.Server.csproj            src/Puzzle.Server/
COPY src/Puzzle.Server.Tests/Puzzle.Server.Tests.csproj src/Puzzle.Server.Tests/
RUN dotnet restore src/Puzzle.Server/Puzzle.Server.csproj

COPY src/ ./src/
RUN dotnet publish src/Puzzle.Server/Puzzle.Server.csproj \
    -c Release -o /app --no-restore

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Levels are pure computation with no database behind them, so the container needs no
# writable state and can run unprivileged.
RUN adduser -D -u 10001 puzzle
USER puzzle

COPY --from=server --chown=puzzle:puzzle /app ./
COPY --from=client --chown=puzzle:puzzle /client/dist ./wwwroot

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_gcServer=0

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/healthz || exit 1

ENTRYPOINT ["dotnet", "Puzzle.Server.dll"]
