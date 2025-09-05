import R from 'ramda';
import Promise from 'bluebird';
import retry from './retry.js';
import { 
  from as fromTrigger, 
  createSQSConnection, 
  fromSQS as fromSQSTrigger, 
  startSQSPolling, 
  stopSQSPolling, 
  stopAllSQSPolling, 
  processRouteListeners,
  initializeRouteTriggers,
  getRouteListeners,
  getSQSConnections,
  getSQSPollingIntervals
} from './route-triggers.js';

let routes = [];
let route;

function init(name) {
  route = {};
  route.name = name;
  route.steps = [];
  return this;
}

function to(processor) {
  route.steps.push({ unit: processor, type: 'processor' });
  return this;
}

function toRoute(routeName) {
  route.steps.push({ unit: routeName, type: 'route' });
  return this;
}

// Route trigger functions are now in route-triggers.js
function from(routeName) {
  fromTrigger(routeName, route);
  return this;
}

function fromSQS(queueNameOrUrl, options = {}) {
  fromSQSTrigger(queueNameOrUrl, options, route);
  return this;
}

function end() {
  routes.push(route);
  
  // If this route has SQS configuration, start polling
  // Only start polling if not in test environment
  if (route.sqsConfig && process.env.NODE_ENV !== 'test') {
    startSQSPolling(route);
  }
}

function getRoute(routeName) {
  return R.find(R.propEq('name', routeName))(routes);
}

const execPipeline = async (execRoute, exchange) => {
  const steps = execRoute.steps;
  let currentExchange = exchange;
  
  for (const step of steps) {
    try {
      currentExchange = await processStep(currentExchange, step);
    } catch (err) {
      throw err;
    }
  }
  
  return currentExchange;
};

async function processRoute(route, exchange) {
  const result = await execPipeline(route, exchange);
  
  // After the route finishes, trigger any listeners
  processRouteListeners(route, result);
  
  return result;
}

const processStep = (ex, step) => {
  if (step.type === 'route') {
    return processRoute(getRoute(step.unit), ex);
  } else {
    return step.unit(ex);
  }
};

async function doRetry(retryRoute, retryExchange, retryStrategy, currentAttempt = 0) {
  let current = R.clone(currentAttempt);
  let exchange = R.clone(retryExchange);
  
  if (current === retryStrategy.retryRepetitions) {
    throw exchange;
  }
  
  current = current++;
  
  try {
    await Promise.delay(retryStrategy.retryDelay);
    
    console.log(`Retry attempt ${current}, exchange: [${JSON.stringify(exchange)}]`);
    
    try {
      const ex = await processRoute(retryRoute, exchange);
      exchange = await processRoute(retryRoute, ex);
      console.warn(`Retry attempt ${current} suceeded, exchange: [${JSON.stringify(exchange)}]`);
      return exchange;
    } catch (e) {
      exchange.exception = { error: e };
      console.error(`Retry attempt ${current} failed, exchange: [${exchange}], exception: [${e}]`);
      return await doRetry(retryRoute, exchange, retryStrategy, current + 1);
    }
  } catch (error) {
    throw error;
  }
}

// SQS polling functions are now in route-triggers.js
// Functions are imported directly above

async function sendMessage(routeName, message) {
  const targetRoute = getRoute(routeName);
  const exchange = message;
  
  try {
    return await processRoute(targetRoute, exchange);
  } catch (error) {
    const retryStrategy = retry.getStrategy(targetRoute.name);
    console.log(`Starting retries, exchange: [${JSON.stringify(exchange)}]`);
    
    try {
      return await doRetry(targetRoute, exchange, retryStrategy);
    } catch (retryError) {
      return retryStrategy.fallbackProcessor(retryError);
    }
  }
}

// Initialize route triggers module after functions are defined
initializeRouteTriggers(processRoute, getRoute);

export default {
  onException: retry.onException,
  to,
  toRoute,
  from,
  fromSQS,
  createSQSConnection,
  stopSQSPolling,
  stopAllSQSPolling,
  getRouteListeners,
  getSQSConnections,
  getSQSPollingIntervals,
  init,
  end,
  getRoutes: () => routes,
  sendMessage,
};
