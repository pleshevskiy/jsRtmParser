
/** @const Шаблоны для парсинга файла */
var patterns = {

    /** @regexp Парсинг методов */
    method: /^(GET|POST|PUT|DELETE):[\t ]*$/gm,

    /** @regexp Парсинг конфигурации */
    config: /^#[\t ]*(\w+)[\t ]*=[\t ]*(.+)$/gm,

    /** @regexp Парсинг ссылок и событий*/
    route: /^([^#][^\s]*)[\t ]+(.+?)$/gm
};


/**
 * @constructor
 * @param {string} fileContent Содержимое файла
 */
function RtmParser(fileContent) {
    this.fileContent = fileContent;
    this.rtmList = [];
}



/**
 * @public
 * Парсит файл .rtm
 */
RtmParser.prototype.parse = function () {
    this.parseMethods_();
    this.parseConfig_();
    this.parseRoutes_();
    return this;
};

/**
 * @private
 * Парсит методы и записывает индекс на каком символе нашел.
 * По этому индексу определяем куда будем записывать значения
 */
RtmParser.prototype.parseMethods_ = function () {
    var match;

    while (match = patterns.method.exec(this.fileContent)) {
        this.rtmList.push({
            method: match[1],
            index: match.index,
            routes: [],
            config: {}
        });
    }
};

/**
 * @private
 * Парсит ссылки и действия и записывает их в общий список
 */
RtmParser.prototype.parseRoutes_ = function () {
    var match, i;

    while (match = patterns.route.exec(this.fileContent)) {
        for (i = this.rtmList.length - 1; i >= 0; --i) {
            // console.log(match[0], match[1], match.index);
            if (match.index <= this.rtmList[i].index) continue;

            this.rtmList[i].routes.push({
                url: match[1],
                action: match[2],
                config: this.rtmList[i].config
            });
            break;
        }
    }
};

/**
 * @private
 * Парсит конфигурацию для метода
 */
RtmParser.prototype.parseConfig_ = function () {
    var match, i;

    while (match = patterns.config.exec(this.fileContent)) {
        for (i = this.rtmList.length - 1; i >= 0; --i) {
            if (match.index <= this.rtmList[i].index) continue;

            /* todo: нужны конфигурации по-умолчанию для каждого метода */
            this.rtmList[i].config[match[1]] = this.parseRtmConfigValue_(match[2]);
            break;
        }
    }
};

/**
 * @private
 * Парсит значение в предполагаемый тип
 * @param {string} matchedValue Значение конфика спарсенное из конфинга .rtm
 * @return {string|boolean|int}
 */
RtmParser.prototype.parseRtmConfigValue_ = function (matchedValue) {
    var result;

    if (matchedValue === 'true' || matchedValue === 'false') {
        result = matchedValue === 'true';
    } else if (!isNaN(+matchedValue)) {
        result = +matchedValue;
    } else {
        result = matchedValue;
    }

    return result;
};

/**
 * @public
 * Конвертирует rtmList в rtmObject
 */
RtmParser.prototype.toObject = function () {
    var rtmObject = {};

    $.each(this.rtmList, function (rtmPart) {
        if (rtmObject[rtmPart.method] == null) {
            rtmObject[rtmPart.method] = [];
        }

        $.push.apply(rtmObject[rtmPart.method], rtmPart.routes);
    });

    return rtmObject;
};


/**
 * Обертка для модуля, чтобы не писать ключевое слово new
 * @param {string} fileContent
 * @see RtmParser
 */
module.exports = function (fileContent) {
    return new RtmParser(fileContent);
};