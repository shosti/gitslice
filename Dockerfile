FROM node:10
COPY . .
RUN yarn install
RUN yarn build
ENTRYPOINT ["node", "./dist/bin/cli.js"]
