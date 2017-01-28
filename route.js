const R = require('ramda')
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
    route.processors.push(processor)
    return this
}

function end() {
    routes.push(route)
}

function loadSubRoutes(route) {
    R.map(f => f(), route.processors)
}

function load() {
    R.map(loadSubRoutes, routes)
}

function getRoute(routeName) {
    return R.find(R.propEq('name', routeName))(routes)
}

function processRoute(route, exchange) {
    var ex = exchange
    route.processors.forEach(processor => {
        console.log(`Exchange: [${exchange}]`)
        ex = processor(exchange)
    })
    return ex
}

function sendMessage(routeName, message) {
    const route = getRoute(routeName)
    var exchange = message
    try {
        return processRoute(route, exchange)
    } catch(e) {
        console.log(`Starting retries, exchange: [${exchange}]`)
        var retryResult = doRetries(route, exchange)
        if (retryResult.error) sendMessage('onException', exchange)
        else return retryResult.exchange
    }
    
}

function doRetries(route, exchange) {
    var err = true
    for(var i = 0 ; i < retryRepetitions ; i++) {
        console.log(`Retry attempt ${i}, exchange: [${exchange}]`)
        try {
            setTimeout(() => {
                exchange = processRoute(route, exchange)
                err = false
                console.log(`Retry attempt ${i} suceeded, exchange: [${exchange}]`)
                i = retryRepetitions
            }, retryDelay)
        } catch(err) {
            err = true
            console.log(`Retry attempt ${i} failed, exchange: [${exchange}]`)
        }
    }

    return {error: err, exchange: ex}
}

function onException(repetitions, delay, fallbackProcessor) {
    retryRepetitions = repetitions
    retryDelay = delay
    this.init('onException')
    .to(fallbackProcessor)
    .end()
}

module.exports = {
    onException: onException,
    to: to,
    init: init,
    load: load,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage
}