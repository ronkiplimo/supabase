FROM node:22-alpine

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src ./src
COPY tsconfig.json .

EXPOSE 3001

CMD ["node", "--import", "tsx/esm", "src/index.ts"]
