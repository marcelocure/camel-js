import camel from '../src/index.js';
import orderProcessor from './processors/orderProcessor.js';
import deliveryProcessor from './processors/deliveryProcessor.js';
import billingProcessor from './processors/billingProcessor.js';

camel
    .init('billingRoute')
    .to(billingProcessor)
    .end();

camel
    .init('orderRoute')
    .to(orderProcessor)
    .toRoute('billingRoute')
    .to(deliveryProcessor)
    .end();

camel
    .init('orderRoute')
    .to(orderProcessor)
    .toRoute('billingRoute')
    .to(deliveryProcessor)
    .end();

camel
    .onException('orderRoute')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
    .end();

const exchange = await camel.sendMessage('orderRoute', {partNumber: 1, customer: 'Cure'})
console.log(exchange);