var routes = require('./route')

routes.init('submitOrder')
    .registerProcessor(orderProcessor)
    .registerProcessor(updateStatusProcessor)
    .end()

routes.sendMessage('submitOrder', 'message')

function orderProcessor(exchange) {
    var order = {exchange: exchange}
    console.log('orderProcessor '+JSON.stringify(order))
    return order
}

function updateStatusProcessor(exchange) {
    var order = exchange
    order.status = 'Completed'
    console.log('updateStatusProcessor '+JSON.stringify(order))
    return order
}