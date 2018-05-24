import csv from 'csvtojson'
import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'
import xml from 'xml2js'

const fsAsync = Promise.promisifyAll(fs)
	, xmlAsync = Promise.promisifyAll(xml)

class Exchange {
	constructor(Model) {
		this.Model = Model
	}

	fileToCurrencies(options) {
		return new Promise((resolve, reject) => {
			Promise.try(() => {
				switch (path.extname(options.file).toLowerCase()) {
					case '.csv': return this._csvToCurrencies(options)
					case '.json': return this._jsonToCurrencies(options)
					case '.xml': return this._xmlToCurrencies(options)
					default: return reject(new Error('File type not supported'))
				}
			})
				.then(currencies => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	_csvToCurrencies(options) {
		const currencies = []
		return new Promise((resolve, reject) => {
			csv({ delimiter: options.delimiter || ';' })
				.fromFile(`${process.cwd()}${options.file}`)
				.then(json => json.reduce(
					(promise, line) => this._lineToCurrency({ line, ...options })
						.then((results) => { currencies.push(...results) })
					, Promise.resolve()
				))
				.then(() => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	_jsonToCurrencies(options) {
		const currencies = []
		return new Promise((resolve, reject) => {
			fsAsync.readFileAsync(`${process.cwd()}${options.file}`, 'utf8')
				.then(data => JSON.parse(data).reduce(
					(promise, line) => this._lineToCurrency({ line, ...options })
						.then((results) => { currencies.push(...results) })
					, Promise.resolve()
				))
				.then(() => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	_xmlToCurrencies(options) {
		const currencies = []
		return new Promise((resolve, reject) => {
			fsAsync.readFileAsync(`${process.cwd()}${options.file}`, 'utf8')
				.then(data => xmlAsync.parseStringAsync(data))
				.then(json => json[options.root ? options.root : 'root.line'].reduce(
					(promise, line) => this._lineToCurrency({ line, ...options })
						.then((results) => { currencies.push(...results) })
					, Promise.resolve()
				))
				.then(() => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	_lineToCurrency(options) {
		return new Promise((resolve, reject) => this.readCurrency({ ...options.line })
			.then((currency) => {
				if (currency) {
					return this.updateCurrency({ ...options, ...currency, value: options.line.value })
				}
				return this.createCurrency({ ...options, ...options.line })
			})
			.then(currencies => resolve(currencies))
			.catch(err => reject(err)))
	}

	createCurrency(options) {
		return new Promise((resolve, reject) => new this.Model({
			from: options.from.toUpperCase()
			, to: options.to.toUpperCase()
			, value: (1 * options.value).toFixed(options.precision ? options.precision : 6)
			, origin: options.origin ? options.origin : 'manual'
		}).save()
			.then(currency => Promise.all([
				currency
				, new this.Model({
					from: options.to.toUpperCase()
					, to: options.from.toUpperCase()
					, value: (1 / options.value).toFixed(options.precision ? options.precision : 6)
					, origin: options.origin ? options.origin : 'manual'
				}).save()
			]))
			.then(currencies => resolve(currencies))
			.catch(err => reject(err)))
	}

	readCurrency(options) {
		return new Promise((resolve, reject) => this.Model.findOne({
			from: options.from.toUpperCase()
			, to: options.to.toUpperCase()
		})
			.then(currency => resolve(currency))
			.catch(err => reject(err)))
	}

	readCurrencies(options) {
		return new Promise((resolve, reject) => {
			Promise.try(() => {
				if (!options.currency) return this.Model.find({})
				return this.Model.find(options.from
					? { from: options.from }
					: { to: options.to })
			})
				.then(currencies => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	updateCurrency(options) {
		return new Promise((resolve, reject) => this.Model.findOneAndUpdate(
			{ from: options.from, to: options.to }
			, {
				$set: {
					value: (1 * options.value).toFixed(options.precision ? options.precision : 6)
					, modified: Date.now()
				}
			}
			, { new: true }
		)
			.then(currency => Promise.all([
				currency
				, this.Model.findOneAndUpdate(
					{ from: options.to, to: options.from }
					, {
						$set: {
							value: (1 / options.value).toFixed(options.precision ? options.precision : 6)
							, modified: Date.now()
						}
					}
					, { new: true }
				)
			]))
			.then(currencies => resolve(currencies))
			.catch(err => reject(err)))
	}

	deleteCurrency(options) {
		return new Promise((resolve, reject) => this.Model.findOneAndRemove({
			from: options.from
			, to: options.to
		})
			.then(() => this.Model.findOneAndRemove({ from: options.to, to: options.from }))
			.then(() => resolve())
			.catch(err => reject(err)))
	}
}

export default Exchange
