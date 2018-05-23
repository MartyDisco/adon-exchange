'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _csvtojson = require('csvtojson');

var _csvtojson2 = _interopRequireDefault(_csvtojson);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _xml2js = require('xml2js');

var _xml2js2 = _interopRequireDefault(_xml2js);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fsAsync = _bluebird2.default.promisifyAll(_fs2.default),
    xmlAsync = _bluebird2.default.promisifyAll(_xml2js2.default);

var Exchange = function () {
	function Exchange(Model) {
		_classCallCheck(this, Exchange);

		this.Model = Model;
	}

	_createClass(Exchange, [{
		key: 'fileToCurrencies',
		value: function fileToCurrencies(options) {
			var _this = this;

			return new _bluebird2.default(function (resolve, reject) {
				switch (_path2.default.extname(options.file).toLowerCase()) {
					case '.csv':
						return _this._csvToCurrencies(options).then(function () {
							return resolve();
						}).catch(function (err) {
							return reject(err);
						});
					case '.json':
						return _this._jsonToCurrencies(options).then(function () {
							return resolve();
						}).catch(function (err) {
							return reject(err);
						});
					case '.xml':
						return _this._xmlToCurrencies(options).then(function () {
							return resolve();
						}).catch(function (err) {
							return reject(err);
						});
					default:
						return reject(new Error('File type not supported'));
				}
			});
		}
	}, {
		key: '_csvToCurrencies',
		value: function _csvToCurrencies(options) {
			var _this2 = this;

			return new _bluebird2.default(function (resolve, reject) {
				(0, _csvtojson2.default)({ delimiter: options.delimiter || ';' }).fromFile('' + process.cwd() + options.file).then(function (json) {
					return json.reduce(function (promises, line) {
						return _this2._lineToCurrency(_extends({ line: line }, options));
					}, _bluebird2.default.resolve());
				}).then(function () {
					return resolve();
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: '_jsonToCurrencies',
		value: function _jsonToCurrencies(options) {
			var _this3 = this;

			return new _bluebird2.default(function (resolve, reject) {
				fsAsync.readFileAsync('' + process.cwd() + options.file, 'utf8').then(function (data) {
					return JSON.parse(data).reduce(function (promises, line) {
						return _this3._lineToCurrency(_extends({ line: line }, options));
					});
				}, _bluebird2.default.resolve()).then(function () {
					return resolve();
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: '_xmlToCurrencies',
		value: function _xmlToCurrencies(options) {
			var _this4 = this;

			return new _bluebird2.default(function (resolve, reject) {
				fsAsync.readFileAsync('' + process.cwd() + options.file, 'utf8').then(function (data) {
					return xmlAsync.parseStringAsync(data);
				}).then(function (json) {
					return json[options.root ? options.root : 'root.line'].reduce(function (promises, line) {
						return _this4._lineToCurrency(_extends({ line: line }, options));
					}, _bluebird2.default.resolve());
				}).then(function () {
					return resolve();
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: '_lineToCurrency',
		value: function _lineToCurrency(options) {
			var _this5 = this;

			return new _bluebird2.default(function (resolve, reject) {
				return _this5.readCurrency(_extends({}, options.line)).then(function (currency) {
					if (currency) {
						return _this5.updateCurrency(_extends({ currency: _extends({}, currency, { value: options.line.value }) }, options));
					}
					return _this5.createCurrency(_extends({ currency: options.line }, options));
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'createCurrency',
		value: function createCurrency(options) {
			var _this6 = this;

			return new _bluebird2.default(function (resolve, reject) {
				return new _this6.Model({
					from: options.from.toUpperCase(),
					to: options.to.toUpperCase(),
					value: options.currency.value.toFixed(options.precision ? options.precision : 6),
					origin: options.origin ? options.origin : 'manual'
				}).save().then(function (currency) {
					return _bluebird2.default.all([currency, new _this6.Model({
						from: options.currency.to.toUpperCase(),
						to: options.currency.from.toUpperCase(),
						value: (1 / options.currency.value).toFixed(options.precision ? options.precision : 6),
						origin: options.origin ? options.origin : 'manual'
					}).save()]);
				}).then(function (currencies) {
					return resolve(currencies);
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'readCurrency',
		value: function readCurrency(options) {
			var _this7 = this;

			return new _bluebird2.default(function (resolve, reject) {
				return _this7.Model.findOne({
					from: options.currency.from.toUpperCase(),
					to: options.currency.to.toUpperCase()
				}).then(function (currency) {
					return resolve(currency);
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'readCurrencies',
		value: function readCurrencies(options) {
			var _this8 = this;

			return new _bluebird2.default(function (resolve, reject) {
				if (!options.currency) return _this8.Model.find({});
				return _this8.Model.find(options.currency.from ? { from: options.currency.from } : { to: options.currency.to }).then(function (currencies) {
					return resolve(currencies);
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'updateCurrency',
		value: function updateCurrency(options) {
			var _this9 = this;

			return new _bluebird2.default(function (resolve, reject) {
				return _this9.Model.findOneAndUpdate({ from: options.currency.from, to: options.currency.to }, {
					$set: {
						value: options.currency.value.toFixed(options.precision ? options.precision : 6),
						modified: Date.now()
					}
				}, { new: true }).then(function (currency) {
					return _bluebird2.default.all([currency, _this9.Model.findOneAndUpdate({ from: options.currency.to, to: options.currency.from }, {
						$set: {
							value: (1 / options.currency.value).toFixed(options.precision ? options.precision : 6),
							modified: Date.now()
						}
					}, { new: true })]);
				}).then(function (currencies) {
					return resolve(currencies);
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}, {
		key: 'deleteCurrency',
		value: function deleteCurrency(options) {
			var _this10 = this;

			return new _bluebird2.default(function (resolve, reject) {
				return _this10.Model.findOneAndRemove({
					from: options.currency.from,
					to: options.currency.to
				}).then(function () {
					return _this10.Model.findOneAndRemove({ from: options.currency.to, to: options.currency.from });
				}).then(function () {
					return resolve();
				}).catch(function (err) {
					return reject(err);
				});
			});
		}
	}]);

	return Exchange;
}();

exports.default = Exchange;
module.exports = exports['default'];
