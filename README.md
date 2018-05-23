# AdOn Exchange

A simple currency manager from Objects - CSV - JSON - XML to mongoose model, promisified with bluebird.

## Installing

Using npm :

```
npm install adon-exchange
```

Using yarn :

```
yarn add adon-exchange
```

## Setup

Import ES6 module style :

```
import Exchange from 'adon-exchange'
```

Or CommonJS style :

```
const Exchange = require('adon-exchange')
```

Then provide a configuration object to the class `constructor` containing your [mongoose](https://github.com/Automattic/mongoose) model :

```
// Example Configuration

import Currency from 'path/to/models/currency'

const exchange = new Exchange(Currency)
```

Your model must contain at least `from`, `to`, `value` fields, and should contain `date`, `modified` and `origin` for better tracking :

```
// Example Currency Model

import mongoose from 'mongoose'

const { Schema } = mongoose
  , currencySchema = new Schema({
    , date: { type: Date, default: Date.now }
    , modified: { type: Date, default: Date.now }
    , origin: { type: String, default: 'automatic' }
    , from: { type: String, required: true }
    , to: { type: String, required: true }
    , value: { type: Number, required: true }
})

export default mongoose.model('Currency', currencySchema)
```

## Useage

#### fileToCurrencies(options)

Assuming you already got a mongoose instance connected to MongoDB and your file uploaded somewhere in your application scope, provide a single object to the `fileToCurrencies` function with the following properties :

```
exchange.fileToCurrencies({
  file: // The path to your file
  , precision: // Opt. Float decimals, default to 6
  , origin: // Opt. Operation origin, default to 'manual'
  , delimiter: // Opt. The CSV delimiter, default to ';'
  , root: // Opt. The XML root path to lines, default to 'root.line'
})
    .then(() => // Job done)
    .catch(err => // Treat errors)
```

#### createCurrency(options)

This function is called to create a new `Currency` and by `fileToCurrencies` for every lines (reverse currency is also created):

```
exchange.createCurrency({
  from: // Origin currency (should be a 3 letters currency code)
  , to: // Destination currency
  , value: // Conversion value
})
  .then(currencies => // Do something with your currencies)
  .catch(err => // Treat errors)
```

#### readCurrency(options)

Get a `currency` by its `from` and `to` properties (reverse currency is also returned) :

```
exchange.readCurrency({
  from: // Origin currency
  , to: // Destination currency
})
  .then(currencies => // Do something with your currencies)
  .catch(err => // Treat errors)
```

#### readCurrencies(options)

Get all `currencies` (without arguments) or by their `from` or `to` properties (reverse currencies are not returned) :

```
exchange.readCurrencies({
  from: // Opt. Origin currency
  , to: // Opt. Destination currency
})
  .then(currencies => // Do something with your currencies)
  .catch(err => // Treat errors)
```

#### updateCurrency(options)

Update `currency` by its `from` and `to` properties, providing a `value` (reverse currency is also updated) :

```
exchange.updateCurrency({
  from: // Origin currency
  , to: // Destination currency
  , value: // New conversion value
})
  .then(currencies => // Do something with your currencies)
  .catch(err => // Treat errors)
```

#### deleteCurrency(options)

Remove `currency` by its `from` and `to` properties (reverse currency is also removed) :

```
exchange.deleteCurrency({
  from: // Origin currency
  , to: // Destination currency
})
  .then(() => // Job Done)
  .catch(err => // Treat errors)
```

## Behaviors

The file format is automatically detected by its extension (currently CSV, JSON and XML).

Creating, reading, updating or deleting a `currency` also apply the reverse operation to its counterpart.

Updating a `currency` also bump its `modified` field to `Date.now()`.

## Coming Soon

- YAML and XLS format.

- Reverse operation `currenciesToFile`.

## Dependencies

* [bluebird](https://github.com/petkaantonov/bluebird) - A full featured promise library with unmatched performance.
* [csvtojson](https://github.com/Keyang/node-csvtojson) - CSV parser to convert CSV to JSON or column arrays.
* [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) - Simple XML to JavaScript object converter.

## License

This project is licensed under the MIT License, see the LICENSE.md file for details.
