var routes = require('./index');

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
    console.log(exc)
    assert(exc.userId, 1)
    assert(exc.message, 'my tweet')
})