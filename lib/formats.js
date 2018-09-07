'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

var util = require('./utils');

/**
 * @callback Formatter
 * @param value {string}
 * @returns {string}
 */

/**
 * @enum {string}
 * @type {Object.<string, string>}
 * @readonly
 */
var Format = {
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

/** @typedef {Format} Format */

module.exports = util.assign(
    {
        'default': /** @type Format */ 'RFC3986',
        /** @type {Object.<Format, Formatter>} */
        formatters: {
            /** @type Formatter */
            RFC1738: function (value) {
                return replace.call(value, percentTwenties, '+');
            },
            /** @type Formatter */
            RFC3986: function (value) {
                return value;
            }
        },
    },
    Format
);
