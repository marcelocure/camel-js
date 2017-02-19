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
        return doRetry(route, exchange, retryStrategy)
        .then (exchange => exchange)
        .catch(exchange => {
            return retryStrategy.fallbackProcessor(exchange)
        })
    })
}

function doRetry(route, exchange, retryStrategy, current=0) {
    if (current === retryStrategy.retryRepetitions) return Promise.reject(exchange)
    var current = current++
    return Promise.delay(retryStrategy.retryDelay)
    .then(() => {
        console.log(`Retry attempt ${current}, exchange: [${JSON.stringify(exchange)}]`)
        return processRoute(route, exchange)
        .then(exchange => {
            exchange = processRoute(route, exchange)
            console.warn(`Retry attempt ${current} suceeded, exchange: [${JSON.stringify(exchange)}]`)
            return Promise.resolve(exchange)
        })
        .catch(e => {
            exchange.exception = {error: e}
            console.error(`Retry attempt ${current} failed, exchange: [${exchange}], exception: [${e}]`)
            return doRetry(route, exchange, retryStrategy, current + 1)
        })
    });
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