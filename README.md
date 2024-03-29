# Hoppscotch Collection Exporter

Этот инструмент предназначен для экспорта коллекций и переменных окружения из Hoppscotch в вебе для последующего использования в Hoppscotch CLI или других целях. Это позволяет легко и быстро переносить существующие коллекции и настройки окружения между различными средами и устройствами.

## Установка

Для работы проекта необходим Node.js. Дополнительные зависимости устанавливать не требуется. Вы можете сразу начать использование, следуя инструкциям ниже.

Убедитесь, что Node.js установлен на вашей машине. Вы можете проверить это, запустив `node -v` в терминале. Если Node.js установлен, вы увидите версию установленного программного обеспечения.

## Использование

Для запуска скрипта и экспорта коллекций используйте следующую команду:

```bash
node index.js [options]
```

В своих опытах использовал данный формат для последующего использования в связке с hoppscotch cli

`FILENAME="Collections.json" && node index.js --file="$FILENAME" && hopp test "$FILENAME"`

Аргументы командной строки

    --help, -h: Показать справку по использованию.
    --mode, -m: Режим работы скрипта. Может быть collection (только коллекции), environment (только переменные окружения), all (коллекции и переменные окружения). По умолчанию: all.
    --name, -n: Имя конкретной коллекции для экспорта. Если не указано, экспортируются все доступные коллекции.
    --file, -f: Путь к файлу для сохранения экспортированных коллекций. Если путь не указан, результаты сохраняются в Collections.json.
    --env_file, -e: Путь к файлу для сохранения экспортированных переменных окружения. По умолчанию: Environment.json.
    --env_name, -en: Имя конкретного окружения для экспорта. Если не указано, экспортируются все глобальные переменные окружения.
    --access_token, -a: Токен доступа для авторизации в Hoppscotch. Может быть задан через переменные окружения ACCESS_TOKEN.

### Получение токена доступа

Токен доступа необходим для авторизации запросов. Вы можете получить его, войдя в свой аккаунт Hoppscotch в вебе и изучив запросы, отправляемые через веб-разработчик инструменты вашего браузера.

Задайте токен доступа через аргумент командной строки `--access_token` или используйте переменную окружения `ACCESS_TOKEN`:

`export ACCESS_TOKEN="ваш_токен_доступа"`

## Примеры

### Экспорт всех коллекций и переменных окружения в стандартный вывод:

```bash
node index.js --mode=all
```

### Экспорт определенной коллекции в файл:

```bash
node index.js --mode=collection --name="Название Коллекции" --file="./collections.json"
```

### Экспорт глобальных переменных окружения в файл:

```bash
node index.js --mode=environment --env_file="./globalEnv.json"
```

## Лицензия

Этот проект распространяется под GNU General Public License v3.0, что обязывает всех пользователей и разработчиков производных работ распространять их под той же лицензией, включая обязательство открытого исходного кода. Это гарантирует, что каждый пользователь имеет свободу использования, изменения и распространения программного обеспечения и всех производных работ.
