'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var each = require('each-async');

/**
 * Initialize a new Pageres
 *
 * @param {Object} options
 * @api public
 */

function Pageres(options) {
	if (!(this instanceof Pageres)) {
		return new Pageres(options);
	}

	EventEmitter.call(this);

	this.options = _.assign({}, options);
	this.options.filename = this.options.filename || '<%= url %>-<%= size %><%= crop %>';

	this.stats = {};
	this.items = [];
	this.sizes = [];
	this.urls = [];
}

util.inherits(Pageres, EventEmitter);
_.assign(Pageres.prototype, require('./lib/util'));
module.exports = Pageres;

/**
 * Get or set page to capture
 *
 * @param {String} url
 * @param {Array} sizes
 * @param {Object} options
 * @api public
 */

Pageres.prototype.src = function (url, sizes, options) {
	if (!arguments.length) {
		return this._src;
	}

	this._src = this._src || [];
	this._src.push({
		url: url,
		sizes: sizes,
		options: options
	});

	return this;
};

/**
 * Get or set the destination directory
 *
 * @param {String} dir
 * @api public
 */

Pageres.prototype.dest = function (dir) {
	if (!arguments.length) {
		return this._dest;
	}

	this._dest = dir;
	return this;
};

/**
 * Run pageres
 *
 * @param {Function} cb
 * @api public
 */

Pageres.prototype.run = function (cb) {
	each(this.src(), function (src, i, next) {
		var options = _.assign({}, this.options, src.options);
		var sizes = _.uniq(src.sizes.filter(/./.test, /^\d{3,4}x\d{3,4}$/i));
		var keywords = _.difference(src.sizes, sizes);

		if (!src.url) {
			cb(new Error('URL required'));
			return;
		}

		this.urls.push(src.url);

		if (!sizes.length && keywords.indexOf('w3counter') !== -1) {
			this.resolution(src.url, options, next);
			return;
		}

		if (keywords.length) {
			this.viewport({url: src.url, sizes: sizes, keywords: keywords}, options, next);
			return;
		}

		sizes.forEach(function (size) {
			this.sizes.push(size);

			try {
				this.items.push(this.create(src.url, size, options));
			} catch (err) {
				next(err);
			}
		}.bind(this));

		next();
	}.bind(this), function (err) {
		if (err) {
			cb(err);
			return;
		}

		this.stats.urls = _.uniq(this.urls).length;
		this.stats.sizes = _.uniq(this.sizes).length;
		this.stats.screenshots = this.items.length;

		if (!this.dest()) {
			cb(null, this.items);
			return;
		}

		this.save(this.items, cb);
	}.bind(this));
};
