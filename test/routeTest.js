var routes = require('../route');
var assert = require('assert');

describe('Route loads properly', function() {
    it('should load route with init, name and second processors', function() {
        routes.init('my route')
        .to(exchange => console.log('my processor'))
        .end()
        assert(routes.getRoutes()[0].name, 'my route')
        assert(routes.getRoutes()[0].processors.length, 2)
    });

    it('should return exchange with status', function() {
        routes.init('orderProcess')
        .to(exchange => {
            return {body: exchange, status: 'Confirmed'}
        })
        .end()
        var exchange = routes.sendMessage('orderProcess','message')
        assert(exchange.status, 'Confirmed')
        assert(exchange.body, 'message')
    })

    it('Should do retries and throw unexpected exception with default error processor', function() {
        routes.init('orderProcessFailing')
        .to(exchange => {
            throw 'Unexpected exception'
        })
        .end()
        routes.onException(5, 1000)

        try {
            var exchange = routes.sendMessage('orderProcessFailing', {})
        } catch(e) {
            assert(e,'Unexpected exception')
        }
    })
});