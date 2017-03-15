var camel = require('../index')
const orderProcessor = require('./processors/orderProcessor')
const deliveryProcessor = require('./processors/deliveryProcessor')
const billingProcessor = require('./processors/billingProcessor')

camel.init('billingRoute')
    .to(billingProcessor)
.end()

camel.init('orderRoute')
    .to(orderProcessor)
    .toRoute('billingRoute')
    .to(deliveryProcessor)
.end()

camel.onException('orderRoute')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
.end()

camel.sendMessage('orderRoute', {partNumber: 1, customer: 'Cure'})
.then(exchange => console.log(exchange))