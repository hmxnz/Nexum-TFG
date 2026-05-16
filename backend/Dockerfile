FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

# nodemon para que recargue automáticamente al cambiar código (modo dev)
CMD ["npm", "run", "dev"]
