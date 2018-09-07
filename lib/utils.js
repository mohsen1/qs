'use strict';

/**
 * @typedef {string} Charset
 * @enum ['iso-8859-1', 'utf-8']
 */

/**
 * @callback Decoder
 * @param {string} str
 * @param {function} decoder
 * @param {Charset} charset
 * @returns {string}
 */

/**
 * @callback Encoder
 * @param {string} str
 * @param {Encoder} defaultEncoder
 * @param {Charset=} charset
 * @returns {string}
 */

/**
 * @typedef UtilOptionsInternalType
 * @property {boolean} allowPrototypes
 * @property {number} arrayLimit
 *
 * @typedef {UtilOptions & UtilOptionsInternalType} UtilOptionsInternal
 */

/**
 * @typedef UtilOptions
 * @property {boolean} allowDots
 * @property {Charset} charset
 * @property {boolean} plainObjects
 */

var has = Object.prototype.hasOwnProperty;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

/**
 * @param queue {array}
 * @returns {object}
 */
var compactQueue = function compactQueue(queue) {
    var obj;

    while (queue.length) {
        var item = queue.pop();
        obj = item.obj[item.prop];

        if (Array.isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }

    return obj;
};

/**
 * @param source {array}
 * @param options {UtilOptionsInternal=}
 * @returns {object}
 */
var arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

/**
 * @param target {array | object}
 * @param source {any=}
 * @param options {UtilOptionsInternal=}
 * @returns target | {object}
 */
var merge = function merge(target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                if (target[i] && typeof target[i] === 'object') {
                    target[i] = merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

/**
 * @param target {object}
 * @param source {object}
 * @returns target
 */
var assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

/** @type {Decoder} */
var decode = function (str, decoder, charset) {
    var strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
};

/**
 * @type {Encoder}
 */
var encode = function encode(str, defaultEncoder, charset) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2d // -
            || c === 0x2e // .
            || c === 0x5f // _
            || c === 0x7e // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5a) // a-z
            || (c >= 0x61 && c <= 0x7a) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xc0 | (c >> 6)] + hexTable[0x80 | (c & 0x3f)]);
            continue;
        }

        if (c < 0xd800 || c >= 0xe000) {
            out = out + (hexTable[0xe0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3f)] + hexTable[0x80 | (c & 0x3f)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3ff) << 10) | (string.charCodeAt(i) & 0x3ff));
        out
            += hexTable[0xf0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3f)]
            + hexTable[0x80 | ((c >> 6) & 0x3f)]
            + hexTable[0x80 | (c & 0x3f)];
    }

    return out;
};

/**
 * @param {*} value
 * @returns {object}
 */
var compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    return compactQueue(queue);
};

/**
 * @param obj {RegExp | any}
 * @returns {boolean}
 */
var isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

/**
 * @param {*} obj
 * @returns {boolean}
 */
var isBuffer = function isBuffer(obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

module.exports = {
    arrayToObject: arrayToObject,
    assign: assign,
    compact: compact,
    decode: decode,
    encode: encode,
    isBuffer: isBuffer,
    isRegExp: isRegExp,
    merge: merge
};
