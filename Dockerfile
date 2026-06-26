FROM node:18-alpine

# Install build tools in case native compilation is required for dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

EXPOSE 3000

# Start server
CMD ["npm", "start"]
