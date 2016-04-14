
var path = require('path');
var fs   = require('fs');
var rl   = require('readline');



/** @const Шаблоны для парсинга файла */
var patterns = {

    /** @regexp Парсинг методов */
    method: /^(GET|POST|PUT|DELETE):\s*$/gm,

    /** @regexp Парсинг конфигурации */
    config: /^#\s*(\w+)\s*=\s*(.+)$/gm,

    /** @regexp Парсинг ссылок и событий*/
    route: /^([^\s]+)\s+([^\s]+?)$/gm
};


/**
 * @constructor
 * @param {string} filepath Путь к файлу
 */
function RtmParser(filepath) {
    this.filepath = filepath;
    this.rtmList = [];
}



/**
 * @public
 * Парсит файл .rtm
 */
RtmParser.prototype.parse = function (callback) {
    var self = this;

    var lineReader = rl.createInterface({
        input: fs.createReadStream(this.filepath)
    });

    var currentConfig;
    var currentRoute;

    lineReader.on('close', function () {
        if (typeof callback === 'function') {
            callback.call(self);
        }
    });

    lineReader.on('line', function (line) {
        var match;

        if (match = patterns.method.exec(line)) {
            self.rtmList.push({
                method: match[1],
                routes: []
            });

            currentConfig = {};
            currentRoute = self.rtmList[self.rtmList.length - 1];

        } else if (match = patterns.config.exec(line)) {
            currentConfig[match[1]] = self.parseRtmConfigValue_(match[2]);

        } else if (match = patterns.route.exec(line)) {
            currentRoute.routes.push({
                url: match[1],
                action: match[2],
                config: currentConfig
            });
        }
    });

    return this;
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

    for (var i = 0, max = this.rtmList.length; i < max; ++i) {
        var rtmPart = this.rtmList[i];

        if (rtmObject[rtmPart.method] == null) {
            rtmObject[rtmPart.method] = [];
        }

        [].push.apply(rtmObject[rtmPart.method], rtmPart.routes);
    }

    return rtmObject;
};


/**
 * Обертка для модуля
 * @param {string} filepath
 * @see RtmParser
 */
module.exports = function (filepath) {
    return new RtmParser(filepath);
};