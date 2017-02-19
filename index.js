const R = require('ramda'),
      retry = require('./retry')
      Promise = require('bluebird');

var routes = [],
    route,
    retryRepetitions = 1,
    retryDelay = 1000

function init(name, processor) {
    route = {}
    route.name = name
    route.processors = []
    return this
}

function to(processor) {
    route.processors.push({unit: processor, type: 'processor'})
    return this
}

function end() {
    routes.push(route)
}

function getRoute(routeName) {
    return R.find(R.propEq('name', routeName))(routes)
}

function transformProcessor(processor) {
    return processor.type === 'route' ? processRoute : processor.unit
}

function processRoute(route, exchange) {
    const processors = R.map(transformProcessor ,route.processors)
    return pipeline(processors, exchange)
}

function sendMessage(routeName, message) {
    const route = getRoute(routeName)
    var exchange = message
    return processRoute(route, exchange)
    .catch(e => {
        const retryStrategy = retry.getStrategy(route.name)
        console.log(`Starting retries, exchange: [${JSON.stringify(exchange)}]`)
        return doRetries(route, exchange, retryStrategy)
        .then (retryResult => {
            if (retryResult.error) return '1'//retryStrategy.fallbackProcessor(retryResult.exchange)
            else return retryResult.exchange
        })
    })
}

function doRetries(route, exchange, retryStrategy) {
    var i = 0
    return new Promise((resolve, reject) => {
        var err = true
        // for(var i = 0 ; i < retryStrategy.retryRepetitions ; i++) {
        console.log(`Retry attempt ${i}, exchange: [${JSON.stringify(exchange)}]`)
        return processRoute(route, exchange)
        .then(exchange => {
            // setTimeout(() => {
                exchange = processRoute(route, exchange)
                err = false
                console.warn(`Retry attempt ${i} suceeded, exchange: [${JSON.stringify(exchange)}]`)
                i = retryStrategy.retryRepetitions
            // }, retryStrategy.retryDelay)
            resolve({error: err, exchange: exchange})
        })
        .catch(e => {
            err = true
            exchange.exception = {error: e}
            console.error(`Retry attempt ${i} failed, exchange: [${exchange}], exception: [${e}]`)
            reject(exchange)
        })
    });
    // }
}

const pipeline = (processors, exchange) => {
    return processors.reduce((agg, processor) =>
        agg.then(result => processor(result))
           .catch(err => {throw err}), Promise.resolve(exchange))
}

module.exports = {
    onException: retry.onException,
    to: to,
    init: init,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage
}