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
					return this.updateCurrency({ currency: { ...currency, value: options.line.value }, ...options })
				}
				return this.createCurrency({ currency: options.line, ...options })
			})
			.then(currencies => resolve(currencies))
			.catch(err => reject(err)))
	}

	createCurrency(options) {
		return new Promise((resolve, reject) => new this.Model({
			from: options.from.toUpperCase()
			, to: options.to.toUpperCase()
			, value: options.currency.value.toFixed(options.precision ? options.precision : 6)
			, origin: options.origin ? options.origin : 'manual'
		}).save()
			.then(currency => Promise.all([
				currency
				, new this.Model({
					from: options.currency.to.toUpperCase()
					, to: options.currency.from.toUpperCase()
					, value: (1 / options.currency.value).toFixed(options.precision ? options.precision : 6)
					, origin: options.origin ? options.origin : 'manual'
				}).save()
			]))
			.then(currencies => resolve(currencies))
			.catch(err => reject(err)))
	}

	readCurrency(options) {
		return new Promise((resolve, reject) => this.Model.findOne({
			from: options.currency.from.toUpperCase()
			, to: options.currency.to.toUpperCase()
		})
			.then(currency => resolve(currency))
			.catch(err => reject(err)))
	}

	readCurrencies(options) {
		return new Promise((resolve, reject) => {
			Promise.try(() => {
				if (!options.currency) return this.Model.find({})
				return this.Model.find(options.currency.from
					? { from: options.currency.from }
					: { to: options.currency.to })
			})
				.then(currencies => resolve(currencies))
				.catch(err => reject(err))
		})
	}

	updateCurrency(options) {
		return new Promise((resolve, reject) => this.Model.findOneAndUpdate(
			{ from: options.currency.from, to: options.currency.to }
			, {
				$set: {
					value: options.currency.value.toFixed(options.precision ? options.precision : 6)
					, modified: Date.now()
				}
			}
			, { new: true }
		)
			.then(currency => Promise.all([
				currency
				, this.Model.findOneAndUpdate(
					{ from: options.currency.to, to: options.currency.from }
					, {
						$set: {
							value: (1 / options.currency.value).toFixed(options.precision ? options.precision : 6)
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
			from: options.currency.from
			, to: options.currency.to
		})
			.then(() => this.Model.findOneAndRemove({ from: options.currency.to, to: options.currency.from }))
			.then(() => resolve())
			.catch(err => reject(err)))
	}
}

export default Exchange
