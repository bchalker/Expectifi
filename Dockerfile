# Expectifi retirement calculator — single service (API + static client) for Railway.
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared ./shared/

RUN npm ci

COPY client ./client
COPY server ./server

ARG VITE_STRIPE_PUBLISHABLE_KEY=
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build -w client

FROM node:20-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared ./shared/

RUN npm ci --omit=dev

COPY server ./server
COPY shared ./shared
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "server"]
