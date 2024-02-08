FROM node:20-alpine

WORKDIR /opt/hoppscotch-util

COPY . .
#COPY ./helm-chart/Chart.yaml ./Chart.yaml TODO: implement helm chart

RUN npm install

# Запустите ваше приложение при старте контейнера
CMD ["node", "index.js"]


# examples
# docker run hoppscotch-exporter --name="YourCollectionName" --file="/path/to/your/outputFile.json"