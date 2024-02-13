FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 
# --loglevel verbose

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
