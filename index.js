var $ = require('njs-utils');

var path = require('path');
var fs   = require('fs');
var rl   = require('readline');



/** @const Шаблоны для парсинга файла */
var patterns = {

    regExp: /^\/(.+)\/([ig]*)$/,

    /** @regexp Парсинг пустых строк */
    empty: /^\s+$/,

    /** @regexp Парсинг комментариев */
    comments: /^#/,

    /** @regexp Парсинг методов */
    method: /^(GET|POST|PUT|DELETE):\s*$/,

    /** @regexp Парсинг конфигурации */
    config: /^(\s*)(@[\.:])(\w+)\s*=\s*(.+)$/,

    /** @regexp Парсинг ссылок и событий*/
    route: /^(\s*)([^\s]+)\s+([^\s]+?)$/
};


/**
 * @constructor
 * @param {string} filepath Путь к файлу
 */
function RtmParser(filepath) {
    this.filepath = filepath;
    this.rtmList = [];
}


$.extend(RtmParser.prototype, {
    /**
     * @public
     * Парсит файл .rtm
     */
    parse: function (hooks) {
        hooks || (hooks = {});

        var self = this;
        var lineReader = rl.createInterface({
            input: fs.createReadStream(this.filepath)
        });

        var currentRoute;
        var globalConfig = {}, methodConfig, currentConfig;
        var preventRouteWhiteSpace = '';

        lineReader.on('line', function (line) {
            var match;

            if (!line.length || patterns.empty.test(line) || patterns.comments.test(line)) {
                // Пропустить линию, если она пуста или это комментарий
                return;
            }

            if (match = patterns.method.exec(line)) {
                self.rtmList.push({
                    method: match[1],
                    routes: []
                });

                methodConfig = $.clone(globalConfig);
                currentRoute = self.rtmList[self.rtmList.length - 1];

            } else if (match = patterns.config.exec(line)) {
                var obj = {}, _config;

                if (currentRoute == null) {
                    _config = globalConfig;
                } else {
                    _config = methodConfig;
                }

                var _key = match[3];
                var _value = parseRtmConfigValue_(match[4]);

                switch (match[2]) {
                    case '@.': {
                        obj[_key] = _value;
                        break;
                    }
                    case '@:': {
                        obj.patterns || (obj.patterns = {});
                        obj.patterns[_key] = _value;
                        break;
                    }
                }

                if (currentRoute && preventRouteWhiteSpace.length && preventRouteWhiteSpace <= match[1]) {
                    $.merge(true, currentConfig, obj);
                } else {
                    $.merge(true, _config, obj);
                }

            } else if (match = patterns.route.exec(line)) {
                currentConfig = $.merge({}, methodConfig, globalConfig);
                preventRouteWhiteSpace = match[1];

                currentRoute.routes.push({
                    url: match[2],
                    action: match[3],
                    config: $.isFunction(hooks.setConfig) ? hooks.setConfig(currentConfig, currentRoute.method) : currentConfig
                });
            }
        });

        lineReader.on('close', function () {
            if ($.isFunction(hooks.onClose)) {
                hooks.onClose.call(self);
            }
        });

        return this;
    },

    /**
     * @public
     * Конвертирует rtmList в rtmObject
     *
     * @return {object}
     */
    toObject: function () {
        var rtmObject = {};

        for (var i = 0, max = this.rtmList.length; i < max; ++i) {
            var rtmPart = this.rtmList[i];

            if (rtmObject[rtmPart.method] == null) {
                rtmObject[rtmPart.method] = [];
            }

            [].push.apply(rtmObject[rtmPart.method], rtmPart.routes);
        }

        return rtmObject;
    }
});

/**
 * @private
 * Парсит значение в предполагаемый тип
 * @param {string} matchedValue Значение конфика спарсенное из конфинга .rtm
 * @return {string|boolean|int}
 */
parseRtmConfigValue_ = function (matchedValue) {
    var result, match;

    if (matchedValue === 'true' || matchedValue === 'false') {
        result = matchedValue === 'true';
    } else if (!isNaN(+matchedValue)) {
        result = +matchedValue;
    } else if (match = patterns.regExp.exec(matchedValue)) {
        result = new RegExp(match[1], match[2]);
    } else {
        result = matchedValue;
    }

    return result;
};


/**
 * Обертка для модуля
 * @param {string} filepath
 * @see RtmParser
 */
module.exports = function (filepath) {
    return new RtmParser(filepath);
};