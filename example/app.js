var camel = require('../index')
const orderProcessor = require('./processors/orderProcessor')
const deliveryProcessor = require('./processors/deliveryProcessor')

camel.init('orderRoute')
    .to(orderProcessor)
    .to(deliveryProcessor)
.end()

camel.sendMessage('orderRoute', {partNumber: 1, customer: 'Cure'})
.then(exchange => console.log(exchange))