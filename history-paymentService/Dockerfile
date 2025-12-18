FROM node:20-alpine

# install openssl (some services include this)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "run", "start"]
