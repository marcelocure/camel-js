var retry = require('../retry');
var assert = require('assert');

describe('Retry loads properly', () =>  {
    it('should load retry with proper params', () =>  {
        retry.onException('my route')
            .retryRepetitions(5)
            .retryDelay(5000)
        .end()

        assert(retry.getExceptions()[0].strategy.routeName, 'my route')
        assert(retry.getExceptions()[0].strategy.retryDelay, 5000)
        assert(typeof(retry.getExceptions()[0].strategy.retryRepetitions), 'function')
    })

    it('Should get correct strategy', () => {
        retry.onException('my first route')
            .retryRepetitions(5)
            .retryDelay(5000)
        .end()

        retry.onException('my second route')
            .retryRepetitions(6)
            .retryDelay(6000)
        .end()

        assert(retry.getStrategy('my second route'))

        assert(retry.getStrategy('my second route').strategy.retryDelay, 5000)
        assert(retry.getStrategy('my second route').strategy.retryRepetitions, 5)
    })

    it('Should get default fallbackProcessor', () => {
        retry.onException('my route')
            .retryRepetitions(5)
            .retryDelay(5000)
        .end()

        assert(retry.getExceptions()[0].strategy.routeName, 'my route')
        assert(retry.getExceptions()[0].strategy.fallbackProcessor, 'function')
    })

    it('Should get customized fallbackProcessor', () => {
        retry.onException('my route')
            .retryRepetitions(5)
            .retryDelay(5000)
            .fallbackProcessor(err => console.log(err))
        .end()

        assert(retry.getExceptions()[0].strategy.routeName, 'my route')
        assert(retry.getExceptions()[0].strategy.fallbackProcessor, 'function')
    })
})