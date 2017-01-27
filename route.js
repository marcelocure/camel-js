const R = require('ramda')
var routes = []
var route

function init(name, processor) {
    route = {}
    route.name = name
    route.processes = [processor]
    return this
}

function registerProcessor(processor) {
    route.processes.push(processor)
    return this
}

function end() {
    routes.push(route)
}

function loadSubRoutes(route) {
    R.map(f => f(), route.processes)
}

function load() {
    R.map(loadSubRoutes, routes)
}

module.exports = {
    registerProcessor: registerProcessor,
    init: init,
    load: load,
    end: end,
    getRoutes: () => routes
}