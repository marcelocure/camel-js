var routes = require('./route'),
    Promise = require('bluebird'),
    R = require('ramda')

// routes.init('submitOrder')
//     .to(orderProcessor)
//     .to(updateStatusProcessor)
//     .end()

// routes.onException(10, 2000, exchange => console.log(`Redelivery: [${exchange}]`))

// routes.sendMessage('submitOrder', 'message')

// function orderProcessor(exchange) {
//     var order = {exchange: exchange}
//     console.log('orderProcessor '+JSON.stringify(order))
//     return order
// }

// function updateStatusProcessor(exchange) {
//     var order = exchange
//     order.status = 'Completed'
//     console.log('updateStatusProcessor '+JSON.stringify(order))
//     return order
// }


// routes.init('orderProcessFailing')
// .to(exchange => {
//     throw 'Unexpected exception'
// })
// .end()
// routes.onException(5, 1000)

// try {
//     var exchange = routes.sendMessage('orderProcessFailing', {})
// } catch(e) {
//     e == 'Unexpected exception'
// }



routes.init('orderProcess')
.to(exchange => {
    return {body: exchange, status: 'Confirmed'}
})
.to(exchange => {
    var e = exchange
    e.code = 12
    return e
})
.end()
return routes.sendMessage('orderProcess','message')
.then(exchange => {
    exchange.status == 'Confirmed'
    exchange.body == 'message'
})


// function doFirstThing(res){ return Promise.resolve(res); }  
// function doSecondThing(res){ return Promise.resolve(res + 1); } 
// function doSecondThing(res){ return Promise.resolve(res + 1); } 
// function doSecondThing(res){ return Promise.resolve(res + 1); } 

// var a = [doFirstThing, doSecondThing, doSecondThing, doSecondThing]

// var pipeline = require('promise-sequence/lib/pipeline');
// pipeline(a, [2])
// .then(console.log)