const http = require("https");
const {writeFile} = require("fs").promises; // Используем асинхронные версии функций FS


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
        if (key.startsWith('--')) {
            args[key.substring(2)] = value || true;
        }// Поддержка флагов без значений
        else if (key.startsWith('-')) args[key.substring(1)] = value || true; // Поддержка флагов без значений
    });
    return args;
}

//
// // Парсинг аргументов командной строки
const args = parseArguments(process.argv);
const help = args.help || args.h; // Помощь
const mode = args.mode || args.m || "all"; // Режим работы: collection - коллекции, environment - окружение, all - коллекции и окружение
const collectionName = args.name || args.n || ""; // Если имя не указано, получаем все коллекции
const outputFilePath = args.file || args.f || null; // Если путь не указан, поддерживаем pipe
const outputFilePathEnv = args.envfile || args.e || "Environment.json";
const envName = args.env_name || args.en || ""; // Если имя не указано, получаем все глобальные Env
const access_token = args.access_token || args.a || process.env.ACCESS_TOKEN; // Если токен не указан, используем переменную окружения
//
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
        // "Content-Length": "322"
    }
};
//
const graphqlPayloadCollection = {
    operationName: "ExportUserCollectionsToJSON",
    query: "query ExportUserCollectionsToJSON($collectionID: ID, $collectionType: ReqType!) {  exportUserCollectionsToJSON(    collectionID: $collectionID    collectionType: $collectionType  ) {    collectionType    exportedCollection  }}",
    variables: {collectionType: "REST"}
};

const graphqlPayloadEnv = {
    operationName: "GetUserEnvironments",
    query: "query GetUserEnvironments {  me {    environments {      id      isGlobal      name      userUid      variables    }  }}",
    variables: {}
}

const graphqlPayloadGlobalEnv = {
    "operationName": "GetGlobalEnvironments",
    "query": "query GetGlobalEnvironments {  me {    globalEnvironments {      id      isGlobal      name      userUid      variables    }  }}",
    "variables": {}
}

/**
 * Рекурсивно обновляет версию запросов и папок в коллекции.
 * @param {Folder | Request} item - Элементы для обновления.
 */
function setVAndData(item) {

    if (item.data && item.data !== "null") {
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
};

function httpsRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) =>
                chunks.push(chunk)
            );
            res.on('end', () => {
                const body = Buffer.concat(chunks);
                const result = JSON.parse(body.toString());
                resolve(result);
            });
        });

        req.on('error', (e) =>
            reject(e)
        );
        if (data) {
            req.write(data);
        } else {
            console.error("fff")
        }
        req.end();
    });
}

async function getCollection() {
    try {
        const collectionsResult = await httpsRequest(options, JSON.stringify(graphqlPayloadCollection));
        // Обработка и сохранение результатов коллекций

        let collectionsString = collectionsResult?.data?.exportUserCollectionsToJSON?.exportedCollection;
        if (!collectionsString) {
            return Promise.reject();
        }
        let collections = JSON.parse(collectionsString);


        if (collectionName) {
            collections = collections.filter(collection => collection.name === collectionName);
        }

        updateVersion(collections);

        if (outputFilePath) {
            await writeFile(outputFilePath, JSON.stringify(collections, null, 2), {flag: "w"});
            console.log("Collections saved to", outputFilePath);
        } else {
            // Вывод в stdout для использования с pipe
            console.log(JSON.stringify(collections, null, 2));
        }
    } catch (e) {
        console.error("error on first request", e)
    }
}

async function getEnvironment() {
    try {
        let environment;

        graphqlPayloadGlobalEnv
        if (!envName) {
            const envResult = await httpsRequest(options, JSON.stringify(graphqlPayloadGlobalEnv));
            if (!envResult.data?.me?.globalEnvironments) {
                console.error(envResult)
                return Promise.reject();
            }
            environment = envResult.data.me.globalEnvironments;
        } else {
            const envResult = await httpsRequest(options, JSON.stringify(graphqlPayloadEnv));
            // Обработка и сохранение результатов окружения
            if (!envResult.data?.me?.environments) {
                console.error(envResult)
                return Promise.reject();
            }

            environment = envResult.data.me.environments.find(env => env.name === envName);
        }

        if (environment.variables) {
            environment.variables = JSON.parse(environment.variables);
        }
        delete environment.userUid;
        delete environment.isGlobal;

        await writeFile(outputFilePathEnv, JSON.stringify(environment, null, 2), {flag: "w"});
        console.log("Environment data saved to", outputFilePathEnv);
    } catch (e) {
        console.error("error on second request", e)
    }
}

function printHelp() {
    console.log(`Usage: node index.js [options]
Options:
--mode, -m\t\t\tMode: collection, environment, all (default: all)
--name, -n\t\t\tName of collection or folder (default: empty) fetch all collections
--file, -f\t\t\tOutput file path (default: stdout)
--envfile, -e\t\t\tOutput environment file path (default: Environment.json)
--env_name, -en\t\t\tName of env  to fetch (default: empty) fetch only global env 
--access_token, -a\t\tAccess token (default: process.env.ACCESS_TOKEN)
--help, -h\t\t\tShow help`);

}

async function main() {
    if (help) {
        printHelp();
        return;
    }

    try {
        if (mode === "collection" || mode === "all") {
            // Первый запрос для коллекций
            await getCollection();
        }
        if (mode === "environment" || mode === "all") {
            // Второй запрос для окружения
            await getEnvironment();
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();

