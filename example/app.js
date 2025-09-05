import camel from '../src/index.js';
import orderProcessor from './processors/orderProcessor.js';
import deliveryProcessor from './processors/deliveryProcessor.js';
import billingProcessor from './processors/billingProcessor.js';
import notificationProcessor from './processors/notificationProcessor.js';

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

// This route will automatically execute when billingRoute finishes
camel
    .init('notifyFinancialRoute')
    .from('billingRoute')
    .to(notificationProcessor)
    .end();

camel
    .onException('orderRoute')
    .retryRepetitions(2)
    .retryDelay(500)
    .fallbackProcessor(err => `error: ${err}`)
    .end();

// Process order through the main route
// This will automatically trigger notifyFinancialRoute when billingRoute finishes
const exchange = await camel.sendMessage('orderRoute', {partNumber: 1, customer: 'Cure'})
console.log('Order processed:', exchange);