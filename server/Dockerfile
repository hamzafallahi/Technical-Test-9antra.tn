FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server code
COPY server/ ./server/

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "server"]
