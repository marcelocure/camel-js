import camel from '../src/index.js';

// Define a source route that processes data
camel
    .init('dataProcessor')
    .to(exchange => {
        console.log('Processing data:', exchange);
        return {
            ...exchange,
            processed: true,
            timestamp: new Date(),
            processedBy: 'dataProcessor'
        };
    })
    .end();

// Define a target route that starts with the output of the source route
camel
    .init('finalProcessor')
    .from('dataProcessor')  // Start with the output of dataProcessor
    .to(exchange => {
        console.log('Final processing:', exchange);
        return {
            ...exchange,
            finalized: true,
            finalProcessor: 'finalProcessor'
        };
    })
    .end();

// Send a message through the source route
// This will automatically trigger finalProcessor when dataProcessor finishes
const result = await camel.sendMessage('dataProcessor', { 
    message: 'Hello from example',
    id: 123 
});

console.log('Source route result:', result);
