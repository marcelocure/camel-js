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

function registerProcessor(processor) {
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
        exchange = processRoute(route, exchange)
    } catch(e) {
        var err = true
        for(var i = 0 ; i < retryRepetitions ; i++) {
            try {
                setTimeout(() => {
                    exchange = processRoute(route, exchange)
                    err = false
                }, retryDelay)
            } catch(err) {
                attempt++
                err = true
            }
        }
        if (!err) return exchange
        else sendMessage('onException', exchange)
    }
    return exchange
}

function onException(repetitions, delay, fallbackProcessor) {
    retryRepetitions = repetitions
    retryDelay = delay
    this.init('onException')
    .registerProcessor(fallbackProcessor)
    .end()
}

module.exports = {
    onException: onException,
    registerProcessor: registerProcessor,
    init: init,
    load: load,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage
}