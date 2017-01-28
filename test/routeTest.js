var routes = require('../route');
var assert = require('assert');

describe('Route loads properly', function() {
    it('should load route with init, name and second processors', function() {
        routes.init('my route')
        .registerProcessor(exchange => console.log('my processor'))
        .end()
        assert(routes.getRoutes()[0].name, 'my route')
        assert(routes.getRoutes()[0].processors.length, 2)
    });

    it('should return exchange with status', function() {
        routes.init('orderProcessor')
        .registerProcessor(exchange => {
            return {body: exchange, status: 'Confirmed'}
        })
        .end()
        var exchange = routes.sendMessage('orderProcessor','message')
        assert(exchange.status, 'Confirmed')
        assert(exchange.body, 'message')
    })
});