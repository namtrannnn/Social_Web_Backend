FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
EXPOSE 9229

CMD ["npm", "start"]