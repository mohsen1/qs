'use strict';

/** @typedef {import('./utils').Charset} Charset */
/** @typedef {import('./utils').UtilOptions} UtilOptions */
/** @typedef {import('./formats').Format} Format */
/** @typedef {import('./formats').Formatter} Formatter */
/** @typedef {import('./utils').Encoder} Encoder */

/**
 * @callback arrayPrefixGenerator
 * @param prefix {string}
 * @param key {string=}
 * @returns {string}
 */

/**
 * @callback Filter
 * @param prefix {string}
 * @param obj<T>
 * @returns T
 */

/**
 * @callback Comparator
 * @param a {any}
 * @param b {any}
 * @returns {number}
 */

/**
 * @typedef StringifyOptionsInternalType
 * @property skipNulls {boolean}
 * @property serializeDate {DateSerializer}
 * @property encode {boolean}
 * @property encoder {Encoder}
 * @property delimiter {string | RegExp}
 * @property encodeValuesOnly {boolean}
 * @property strictNullHandling {boolean}
 * @property charsetSentinel {boolean}
 * @property format {Format}
 *
 * @typedef {UtilOptions & StringifyOptionsInternalType} StringifyOptionsInternal
 */

/**
 * @typedef StringifyOptionsType
 * @property allowDots= {boolean}
 * @property skipNulls= {boolean}
 * @property serializeDate= {DateSerializer}
 * @property encode= {boolean}
 * @property encoder= {Encoder}
 * @property delimiter= {string | RegExp}
 * @property encodeValuesOnly= {boolean}
 * @property strictNullHandling= {boolean}
 * @property charsetSentinel= {boolean}
 * @property format= {Format}
 *
 * @typedef {StringifyOptionsInternal & StringifyOptionsType} StringifyOptions
 */

/**
 * @callback DateSerializer
 * @param date {Date}
 * @returns {string}
 */

var utils = require('./utils');
var formats = require('./formats');

/** @type {Object.<string, arrayPrefixGenerator>} */
var arrayPrefixGenerators = {
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

/** @type StringifyOptions */
var defaults = {
    allowDots: false,
    charsetSentinel: false,
    charset: 'utf-8',
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    plainObjects: false,
    /** @type DateSerializer */
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    /**
     * @type {object | Date | null | undefined | string | number | boolean}
     */
    object,
    /** @type {string} */ prefix,
    /** @type {arrayPrefixGenerator} */ generateArrayPrefix,
    /** @type {boolean} */ strictNullHandling,
    /** @type {boolean} */ skipNulls,
    /** @type {Encoder} */ encoder,
    /** @type {Filter} */ filter,
    /** @type {Comparator} */ sort,
    /** @type {boolean} */ allowDots,
    /** @type {DateSerializer} */ serializeDate,
    /** @type {Formatter} */ formatter,
    /** @type {boolean} */ encodeValuesOnly,
    /** @type {Charset} */ charset
) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    /** @type array */
    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            /** @type array */
            values = values.concat(stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly,
                charset
            ));
        } else {
            /** @type array */
            values = values.concat(stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly,
                charset
            ));
        }
    }

    return values;
};

/**
 * @param object {object}
 * @param opts {StringifyOptions=}
 * @returns string
 */
module.exports = function (object, opts) {
    var obj = object;
    var options = opts ? utils.assign({}, opts) : {};

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    /** @type Charset */
    var charset = options.charset || 'utf-8';
    if (charset !== undefined && charset !== 'utf-8' && charset !== 'iso-8859-1') {
        throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
    }

    if (typeof options.format === 'undefined') {
        options.format = formats['default'];
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    /**
     * @type {string[]}
     */
    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly,
            charset
        ));
    }

    var joined = keys.join(delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    if (options.charsetSentinel) {
        if (charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        } else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }

    return joined.length > 0 ? prefix + joined : '';
};
