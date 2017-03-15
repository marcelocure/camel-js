var camel = require('../index')
const orderProcessor = require('./processors/orderProcessor')
const deliveryProcessor = require('./processors/deliveryProcessor')
const billingProcessor = require('./processors/billingProcessor')

camel.init('orderRoute')
    .to(orderProcessor)
    .to(deliveryProcessor)
.end()

camel.onException('orderRoute')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
.end()

camel.init('billingRoute')
    .to(billingProcessor)
.end()

camel.onException('orderRoute')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
.end()

camel.sendMessage('orderRoute', {partNumber: 1, customer: 'Cure'})
.then(exchange => console.log(exchange))