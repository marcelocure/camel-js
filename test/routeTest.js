var routes = require('../route');
var assert = require('assert');

describe('Route loads properly', function() {
    it('should load route with init, name and second processors', function() {
        routes.init('my route', () => console.log('init'))
            .registerProcessor(() => console.log('my processor'))
            .end()
        assert(routes.getRoutes()[0].name, 'my route')
        assert(routes.getRoutes()[0].processors.length, 2)
    });
});