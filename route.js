var routes = require('./index');
var assert = require('assert');

routes.init('orderProcessFailing')
    .to(exchange => {
        exchange.msg = 'success'
        return exchange
    })
.end()


return routes.sendMessage('orderProcessFailing', {})
.then(exchange => {
    assert(exchange.msg,'success')
})
.catch(e => {
    assert(e.exception.error,'Unexpected exception')
})