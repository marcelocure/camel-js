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

function sendMessage(routeName, message) {
    const route = getRoute(routeName)
    var exchange = message
    route.processors.forEach(processor => {
        console.log(`Exchange: [${exchange}]`)
        exchange = processor(exchange)
    })
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