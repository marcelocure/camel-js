var routes = require('../index');
var assert = require('assert');

describe('Route loads properly', () =>  {
    it('should load route with init, name and second processors', () =>  {
        routes.init('my route')
        .to(exchange => console.log('my processor'))
        .end()
        assert(routes.getRoutes()[0].name, 'my route')
        assert(routes.getRoutes()[0].processors.length, 2)
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

    it('Should do retries and throw unexpected exception with default error processor', () =>  {
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
})