const R = require('ramda')
var routes = []
var route

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

function sendMessage(routeName, message) {
    const route = R.find(R.propEq('name', routeName))(routes)
    // R.map(processor => processor(message), route.processors)
    var exchange = message
    route.processors.forEach(processor => {
        exchange = processor(exchange)
    })
    return exchange
}

module.exports = {
    registerProcessor: registerProcessor,
    init: init,
    load: load,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage
}