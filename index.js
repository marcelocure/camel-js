const R = require('ramda'),
      retry = require('./retry')
      core = require('./adapters/core')
      Promise = require('bluebird');

var routes = [],
    route,
    retryRepetitions = 1,
    retryDelay = 1000

function init(name) {
    route = {}
    route.name = name
    route.steps = []
    return this
}

function from(protocol, options) {
    const routeName = protocol + JSON.stringify(options)
    core.from(protocol, options, routeName)
    var res = init(routeName)
    return res
}

function to(processor) {
    route.steps.push({unit: processor, type: 'processor'})
    return this
}

function toRoute(routeName) {
    route.steps.push({unit: routeName, type: 'route'})
    return this
}

function end() {
    routes.push(route)
}

function getRoute(routeName) {
    return R.find(R.propEq('name', routeName))(routes)
}

function processRoute(route, exchange) {
    return execPipeline(route, exchange)
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

const processStep = (ex, step) => {
    if (step.type === 'route') {
        var route = getRoute(step.unit)
        return processRoute(route, ex)
    } else {
        return step.unit(ex)
    } 
}

const execPipeline = (route, exchange) => {
    const steps = route.steps

    return steps.reduce((agg, step) =>
        agg.then(ex => processStep(ex, step))
           .catch(err => {throw err}), Promise.resolve(exchange))
}

module.exports = {
    onException: retry.onException,
    to: to,
    toRoute: toRoute,
    init: init,
    end: end,
    getRoutes: () => routes,
    sendMessage: sendMessage,
    from: from
}