const http = require("https");
const { writeFile } = require("fs");


/**
 * Объект, представляющий запрос.
 * @typedef {Object} Request
 * @property {string} id - Уникальный идентификатор запроса.
 * @property {string} name - Название запроса.
 * @property {string} v - Версия.
 * @property {{authType: string, authActive: boolean}} auth - Авторизация.
 * @property {{body: null|string, contentType: null|string}} body - Тело запроса.
 * @property {string} method - HTTP метод.
 * @property {Array} params - Параметры запроса.
 * @property {Array} headers - Заголовки запроса.
 * @property {string} endpoint - URL endpoint.
 * @property {string} testScript - Тестовый скрипт.
 * @property {string} preRequestScript - Скрипт перед запросом.
 */

/**
 * Объект, представляющий папку.
 * @typedef {Object} Folder
 * @property {string} id - Уникальный идентификатор папки.
 * @property {string} name - Название папки.
 * @property {Folder[]} folders - Вложенные папки.
 * @property {Request[]} requests - Запросы в папке.
 * @property {string} data - Данные папки.
 */

/**
 * Объект, представляющий коллекцию.
 * @typedef {Object} Collection
 * @property {string} id - Уникальный идентификатор коллекции.
 * @property {string} name - Название коллекции.
 * @property {Folder[]} folders - Папки в коллекции.
 * @property {Request[]} requests - Запросы в коллекции.
 * @property {string} data - Данные коллекции.
 */

// Функция для парсинга наименованных аргументов командной строки
function parseArguments(argv) {
    const args = {};
    argv.slice(2).forEach(arg => {
        const [key, value] = arg.split('=');
        if (key.startsWith('--')) args[key.substring(2)] = value || true; // Поддержка флагов без значений
    });
    return args;
}

// Парсинг аргументов командной строки
const args = parseArguments(process.argv);
const collectionOrFolderName = args.name || "";
const outputFilePath = args.file || null; // Если путь не указан, поддерживаем pipe
const access_token = args.access_token || process.env.ACCESS_TOKEN;


const options = {
    "method": "POST",
    "hostname": "hs-backend.infrastructure.prosebya.tech",
    "port": null,
    "path": "/graphql",
    "headers": {
        "cookie": `access_token=${access_token};`,
        "authority": "hs-backend.infrastructure.prosebya.tech",
        "accept": "application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed",
        "accept-language": "ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,tr;q=0.6",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "dnt": "1",
        "origin": "https://hs.infrastructure.prosebya.tech",
        "pragma": "no-cache",
        "referer": "https://hs.infrastructure.prosebya.tech/",
        "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Content-Length": "322"
    }
};

const graphqlPayload = "{\"operationName\":\"ExportUserCollectionsToJSON\",\"query\":\"query ExportUserCollectionsToJSON($collectionID: ID, $collectionType: ReqType!) {  exportUserCollectionsToJSON(    collectionID: $collectionID    collectionType: $collectionType  ) {    collectionType    exportedCollection  }}\",\"variables\":{\"collectionType\":\"REST\"}}";

/**
 * Рекурсивно обновляет версию запросов и папок в коллекции.
 * @param {Folder | Request} item - Элементы для обновления.
 */
function setVAndData(item ) {

    if (item.data && item.data !=="null") {
        const data = JSON.parse(item.data);
        Object.keys(data).forEach(key => {
            item[key] = data[key]
        })
    }

    delete item.data;

    if (!item.v) {
        item.v = 2;
    }
}

/**
 * Рекурсивно обновляет версию запросов и папок в коллекции.
 * @param {Folder[] | Collection[]} items - Элементы для обновления.
 */
function updateVersion(items) {
    items.forEach(item => {
        setVAndData(item);
        if (item.requests) {
            item.requests.forEach(setVAndData);
        }

        if (item.folders) {
            updateVersion(item.folders);
        }
    });
}

const req = http.request(options, function (res) {
    const chunks = [];

    res.on("data", function (chunk) {
        chunks.push(chunk);
    });

    res.on("end", function () {
        const body = Buffer.concat(chunks);
        const result = JSON.parse(body.toString());

        // Обработка полученных данных
        if (result && result.data && result.data.exportUserCollectionsToJSON && result.data.exportUserCollectionsToJSON.exportedCollection) {
            let collections = JSON.parse(result.data.exportUserCollectionsToJSON.exportedCollection);

            if (collectionOrFolderName) {
                collections = collections.filter(collection => collection.name === collectionOrFolderName);
            }

            updateVersion(collections);

            if (outputFilePath) {
                writeFile(outputFilePath, JSON.stringify(collections, null, 2), err => {
                    if (err) return console.error("Error writing file:", err);
                    console.log("Data saved to", outputFilePath);
                });
            } else {
                // Вывод в stdout для использования с pipe
                console.log(JSON.stringify(collections, null, 2));
            }
        } else {
            console.error("No valid data received.");
        }
    });
});

req.on("error", (e) => {
    console.error(`Problem with request: ${e.message}`);
});

// Замените это телом запроса, соответствующим вашим требованиям
req.write(graphqlPayload);
req.end();
