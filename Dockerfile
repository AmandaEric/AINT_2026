FROM node:24-slim

# Python for tts.py
RUN apt-get update && apt-get install -y python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# If tts.py needs packages, list them in requirements.txt
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then pip3 install --break-system-packages -r requirements.txt; fi

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]