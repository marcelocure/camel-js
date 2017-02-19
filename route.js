var routes = require('./index');
var assert = require('assert');

routes.init('orderProcessFailing')
    .to(exchange => {
        if (exchange.exception === undefined) {
            throw 'Unexpected exception'
        } else {
            exchange.msg = 'success'
            return exchange
        }
    })
.end()

routes.onException('orderProcessFailing')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
.end()

return routes.sendMessage('orderProcessFailing', {})
.then(exchange => {
    assert(exchange.msg,'success')
})
.catch(e => {
    assert(e.exception.error,'Unexpected exception')
})