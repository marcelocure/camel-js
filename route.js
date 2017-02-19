var routes = require('./index');
var assert = require('assert');

routes.init('orderProcessFailing')
    .to(exchange => {
        throw 'Unexpected exception'
    })
.end()

routes.onException('orderProcessFailing')
        .retryRepetitions(5)
        .retryDelay(5000)
        .fallbackProcessor(err => `error: ${err}`)
    .end()

return routes.sendMessage('orderProcessFailing', {})
.then(e => {
    assert(e,'error: Unexpected exception')
})
.catch(e => {
    assert(e.exception.error,'Unexpected exception')
})