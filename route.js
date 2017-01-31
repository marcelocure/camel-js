const R = require('ramda'),
      Promise = require('bluebird'),
      pipeline = require('promise-sequence/lib/pipeline');

var routes = [],
    route,
    retryRepetitions = 1,
    retryDelay = 1000,
    routeFallbackProcessor = defaultFallbackProcessor

function init(name, processor) {
    route = {}
    route.name = name
    route.processors = []
    return this
}

//TODO change to {processor: processor, type: 'to'}
function to(processor) {
    route.processors.push(processor)
    return this
}

function end() {
    routes.push(route)
}

function getRoute(routeName) {
    return R.find(R.propEq('name', routeName))(routes)
}

function processRoute(route, exchange) {
    return pipeline(route.processors, [exchange])
}

// function returnPromisified(func) {
//     if (func instanceof Promise) return func 
//     return val => {
//         new Promise((resolve, reject) => {
//             res = func(val)
//             resolve(res)
//         })
//     }
// }

function sendMessage(routeName, message) {
    const route = getRoute(routeName)
    var exchange = message
    try {
        return processRoute(route, exchange)
    } catch(e) {
        console.log(`Starting retries, exchange: [${JSON.stringify(exchange)}]`)
        var retryResult = doRetries(route, exchange)
        if (retryResult.error) routeFallbackProcessor(retryResult.exchange)
        else return retryResult.exchange
    }
}

function doRetries(route, exchange) {
    var err = true
    for(var i = 0 ; i < retryRepetitions ; i++) {
        console.log(`Retry attempt ${i}, exchange: [${JSON.stringify(exchange)}]`)
        try {
            setTimeout(() => {
                exchange = processRoute(route, exchange)
                err = false
                console.warn(`Retry attempt ${i} suceeded, exchange: [${JSON.stringify(exchange)}]`)
                i = retryRepetitions
            }, retryDelay)
        } catch(e) {
            err = true
            exchange.exception = e
            console.error(`Retry attempt ${i} failed, exchange: [${exchange}], exception: [${exception}]`)
        }
    }

    return {error: err, exchange: exchange}
}

function defaultFallbackProcessor(exchange) {
    console.log(`defaultFallbackProcessor exchange: [${JSON.stringify(exchange)}]`)
    throw exchange.exception
}

function onException(repetitions, delay, fallbackProcessor=defaultFallbackProcessor) {
    retryRepetitions = repetitions
    retryDelay = delay
    routeFallbackProcessor = fallbackProcessor
}

module.exports = {
    onException: onException,
    to: to,
    init: init,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage
}