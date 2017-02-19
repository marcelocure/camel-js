const R = require('ramda')
var exception = {}
var exceptions = []

function onException(routeName) {
    exception.routeName = routeName
    exception.fallbackProcessor = defaultFallbackProcessor
    return this
}

function retryRepetitions(value) {
    exception.retryRepetitions = value
    return this
}

function retryDelay(value) {
    exception.retryDelay = value
    return this
}

function fallbackProcessor(func){
    exception.fallbackProcessor = func
    return this
}

function end() {
    exceptions.push({routeName: exception.routeName, strategy: exception})
}

function defaultFallbackProcessor(exchange) {
    console.log(`defaultFallbackProcessor exchange: [${JSON.stringify(exchange)}]`)
    throw exchange.exception
}

function getStrategy(routeName) {
    return R.find(R.propEq('routeName', routeName))(exceptions);
}

module.exports = {
    onException: onException,
    getExceptions: () => exceptions,
    retryRepetitions: retryRepetitions,
    retryDelay: retryDelay,
    fallbackProcessor: fallbackProcessor,
    end: end,
    getStrategy: getStrategy
}