var routes = require('../index');
var assert = require('assert');

describe('Route loads properly', () =>  {
    it('should load route with init, name and second processors', () =>  {
        routes.init('my route')
        .to(exchange => console.log('my processor'))
        .end()
        assert(routes.getRoutes()[0].name, 'my route')
        assert(routes.getRoutes()[0].steps.length, 2)
    });

    it('should return exchange with status', () =>  {
        routes.init('orderProcess')
        .to(exchange => {
            return {body: exchange, status: 'Confirmed'}
        })
        .end()

        return routes.sendMessage('orderProcess', {message: 'message'})
        .then(exc => {
            assert(exc.status, 'Confirmed')
            assert(exc.body, {message: 'message'})
        })
    })

    it('Should do retries and recover', () =>  {
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
                .retryDelay(200)
                .fallbackProcessor(err => `error: ${err}`)
            .end()

        return routes.sendMessage('orderProcessFailing', {})
        .then(exchange => {
            assert(exchange.msg,'success')
        })
        .catch(e => {
            assert(e.exception.error,'Unexpected exception')
        })
    })

    it('Should do retries and throw unexpected exception with custom error processor', () =>  {
        routes.init('orderProcessFailing')
            .to(exchange => {
                throw 'Unexpected exception'
            })
        .end()

        routes.onException('orderProcessFailing')
                .retryRepetitions(1)
                .retryDelay(500)
                .fallbackProcessor(err => `error: ${err}`)
            .end()

        return routes.sendMessage('orderProcessFailing', {})
        .catch(e => {
            assert(e.exception.error,'Unexpected exception')
        })
    })

    it('Should do retries and throw unexpected exception with default error processor', () =>  {
        routes.init('orderProcessFailing')
            .to(exchange => {
                throw 'Unexpected exception'
            })
        .end()

        return routes.sendMessage('orderProcessFailing', {})
        .catch(e => {
            assert(e.exception.error,'Unexpected exception')
        })
    })

    it('Should load mixed processors into promises', () => {
        routes.init('tweetProcess')
        .to(exchange => {
            return {userId: 1, message: exchange}
        })
        .to(exchange => {
            var tweet = exchange
            tweet.date = new Date
            return Promise.resolve(tweet)
        })
        .end()

        return routes.sendMessage('tweetProcess', 'my tweet')
        .then(exc => {
            assert(exc.userId, 1)
            assert(exc.message, 'my tweet')
        })
    })

    it('should return exchange with proper result when route is composed by other route', () =>  {
        routes.init('billingRoute')
        .to(exchange => {
            var order = exchange
            order.billed = true
            return order
        })
        .end()
        
        routes.init('orderRoute')
        .to(exchange => {
            var order = exchange
            order.date = new Date
            return order
        })
        .toRoute('billingRoute')
        .to(exchange => {
            var order = exchange
            order.status = 'Processed'
            return order
        })
        .end()

        return routes.sendMessage('orderRoute', {message: 'message'})
        .then(exc => {
            assert(exc.status, 'Processed')
            assert(exc.billed, true)
            assert(exc.message, 'message')
        })
    })
})