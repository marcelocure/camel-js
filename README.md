# camel-js

[![Coverage Status](https://coveralls.io/repos/github/marcelocure/camel-js/badge.svg?branch=master)](https://coveralls.io/github/marcelocure/camel-js?branch=master)
[![Build Status](https://travis-ci.org/marcelocure/camel-js.svg)](https://travis-ci.org/marcelocure/camel-js.svg)

A lightweight, Apache Camel-inspired routing and integration library for Node.js. Build robust message processing pipelines with built-in retry mechanisms, error handling, and route composition.

## Features

- 🚀 **Simple Route Definition**: Fluent API for creating message processing routes
- 🔄 **Built-in Retry Logic**: Configurable retry strategies with custom delays and fallback processors
- 🔗 **Route Composition**: Chain routes together for complex processing pipelines
- ⚡ **Promise-based**: Full Promise support for asynchronous operations
- 📦 **ES6 Modules**: Modern JavaScript with import/export syntax
- 🧪 **Well Tested**: Comprehensive test suite with 100% coverage

## Installation

```bash
npm install camel-js
```

## Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0

## Quick Start

```javascript
import camel from 'camel-js';

// Define a simple route
camel
  .init('processOrder')
  .to(exchange => {
    console.log('Processing order:', exchange);
    return { ...exchange, processed: true };
  })
  .end();

// Send a message through the route
const result = await camel.sendMessage('processOrder', { orderId: 123 });
console.log(result); // { orderId: 123, processed: true }
```

## API Reference

### Route Definition

#### `camel.init(routeName)`
Creates a new route with the specified name.

#### `camel.to(processor)`
Adds a processor function to the current route.

#### `camel.toRoute(routeName)`
Adds a reference to another route in the current route.

#### `camel.from(routeName)`
Registers the current route as a listener to another route. When the specified route finishes executing, the current route will automatically be triggered with the output of the source route.

#### `camel.createSQSConnection(connectionName, config)`
Creates a reusable SQS connection configuration that can be referenced by name in `fromSQS` calls.

**Parameters:**
- `connectionName` (string): Name to reference this connection
- `config` (object): Connection configuration
  - `region` (string): AWS region (default: 'us-east-1')
  - `accessKeyId` (string): AWS access key ID
  - `secretAccessKey` (string): AWS secret access key
  - `maxMessages` (number): Maximum messages to receive per poll (default: 10)
  - `waitTimeSeconds` (number): Long polling wait time (default: 20)
  - `visibilityTimeoutSeconds` (number): Message visibility timeout (default: 30)
  - `pollingInterval` (number): Polling interval in milliseconds (default: 1000)

#### `camel.fromSQS(queueNameOrUrl, options)`
Registers the current route to be triggered by AWS SQS messages. Can use either a connection name or full queue URL.

**Parameters:**
- `queueNameOrUrl` (string): Either a connection name (created with `createSQSConnection`) or full SQS queue URL
- `options` (object): Optional overrides for connection settings
  - `queueUrl` (string): Required when using connection name
  - `maxMessages` (number): Override max messages per poll
  - `waitTimeSeconds` (number): Override long polling wait time
  - `visibilityTimeoutSeconds` (number): Override message visibility timeout
  - `pollingInterval` (number): Override polling interval

#### `camel.end()`
Finalizes the current route definition.

### Error Handling & Retries

#### `camel.onException(routeName)`
Configures error handling for a specific route.

#### `.retryRepetitions(count)`
Sets the number of retry attempts.

#### `.retryDelay(milliseconds)`
Sets the delay between retry attempts.

#### `.fallbackProcessor(processor)`
Sets a fallback processor for when all retries fail.

### Message Processing

#### `camel.sendMessage(routeName, message)`
Sends a message through the specified route. Returns a Promise.

## Examples

### Basic Route with Multiple Processors

```javascript
import camel from 'camel-js';

// Define processors
const validateProcessor = exchange => {
  if (!exchange.orderId) {
    throw new Error('Order ID is required');
  }
  return exchange;
};

const processOrderProcessor = exchange => {
  return { ...exchange, status: 'processed', timestamp: new Date() };
};

// Create route
camel
  .init('orderProcessing')
  .to(validateProcessor)
  .to(processOrderProcessor)
  .end();

// Process a message
const result = await camel.sendMessage('orderProcessing', { orderId: 123 });
```

### Route Composition

```javascript
import camel from 'camel-js';

// Define sub-routes
camel
  .init('billingRoute')
  .to(exchange => ({ ...exchange, billed: true }))
  .end();

camel
  .init('deliveryRoute')
  .to(exchange => ({ ...exchange, delivered: true }))
  .end();

// Compose main route
camel
  .init('orderRoute')
  .to(exchange => ({ ...exchange, orderDate: new Date() }))
  .toRoute('billingRoute')
  .toRoute('deliveryRoute')
  .end();
```

### Event-Driven Routes with `from`

```javascript
import camel from 'camel-js';

// Define a source route
camel
  .init('dataProcessor')
  .to(exchange => {
    return { ...exchange, processed: true, timestamp: new Date() };
  })
  .end();

// Define a listener route that automatically executes when dataProcessor finishes
camel
  .init('notificationProcessor')
  .from('dataProcessor')  // Listen to dataProcessor completion
  .to(exchange => {
    console.log('Notification sent for:', exchange);
    return { ...exchange, notificationSent: true };
  })
  .end();

// Execute the source route - this will automatically trigger the notification route
const result = await camel.sendMessage('dataProcessor', { message: 'test' });
// The notificationProcessor will automatically execute with the result
```

### AWS SQS Integration with `fromSQS`

```javascript
import camel from 'camel-js';

// Create a reusable SQS connection
camel.createSQSConnection('myAWSConnection', {
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  maxMessages: 5,
  waitTimeSeconds: 10,
  visibilityTimeoutSeconds: 30,
  pollingInterval: 2000
});

// Define a route that processes SQS messages using connection name
camel
  .init('sqsProcessor')
  .fromSQS('myAWSConnection', {
    queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'
  })
  .to(exchange => {
    console.log('Processing SQS message:', exchange);
    return { ...exchange, processed: true, processedAt: new Date() };
  })
  .end();

// Another route using the same connection but different queue
camel
  .init('sqsProcessor2')
  .fromSQS('myAWSConnection', {
    queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/another-queue'
  })
  .to(exchange => {
    console.log('Processing from another queue:', exchange);
    return { ...exchange, processed: true };
  })
  .end();

// SQS polling starts automatically when routes are defined
// Messages from the SQS queues will trigger the route processing
```

### Error Handling with Retries

```javascript
import camel from 'camel-js';

// Define a route that might fail
camel
  .init('unreliableService')
  .to(exchange => {
    if (Math.random() < 0.5) {
      throw new Error('Service temporarily unavailable');
    }
    return { ...exchange, processed: true };
  })
  .end();

// Configure retry strategy
camel
  .onException('unreliableService')
  .retryRepetitions(3)
  .retryDelay(1000)
  .fallbackProcessor(error => {
    console.error('All retries failed:', error);
    return { error: 'Service unavailable', fallback: true };
  })
  .end();

// Send message (will retry on failure)
const result = await camel.sendMessage('unreliableService', { data: 'test' });
```

## Development

### Running Tests

```bash
npm test
```

### Running Coverage

```bash
npm run test-cov
```

This will run all tests with coverage reporting using c8, which supports ES6 modules.

#### Coverage Options

**Basic Coverage Report:**
```bash
npm run test-cov
```

**HTML Coverage Report:**
```bash
npx c8 --reporter=html mocha
```

**Text Coverage Report:**
```bash
npx c8 --reporter=text mocha
```

**Coverage with LCOV output (for CI/CD):**
```bash
npx c8 --reporter=lcov mocha
```

#### Current Coverage
- **Statements:** 97.17%
- **Branches:** 97.29%
- **Functions:** 95%
- **Lines:** 97.17%

### Project Structure

```
camel-js/
├── src/
│   ├── index.js      # Main routing logic
│   └── retry.js      # Retry mechanism
├── example/
│   ├── app.js        # Example application
│   └── processors/   # Example processors
├── test/
│   ├── routeTest.js  # Route functionality tests
│   └── retryTest.js  # Retry mechanism tests
└── package.json
```

## License

ISC

## Author

Marcelo Cure

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Basic routing functionality
- Retry mechanism with configurable strategies
- Route composition support
- ES6 module support