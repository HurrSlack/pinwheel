FROM node:14
WORKDIR /usr/src/app
RUN npm install -g npm@8
COPY package*.json ./
RUN npm install --production --ignore-scripts
COPY lib ./lib
ENTRYPOINT [ "node", "lib/server.js" ]
