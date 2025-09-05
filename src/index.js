import R from 'ramda';
import Promise from 'bluebird';
import retry from './retry.js';

let routes = [];
let route;
let routeListeners = {}; // Track which routes listen to other routes

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

function from(routeName) {
  // Register this route as a listener to the source route
  if (!routeListeners[routeName]) {
    routeListeners[routeName] = [];
  }
  routeListeners[routeName].push(route.name);
  return this;
}

function end() {
  routes.push(route);
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
  if (routeListeners[route.name]) {
    const listeners = routeListeners[route.name];
    listeners.forEach(listenerRouteName => {
      const listenerRoute = getRoute(listenerRouteName);
      if (listenerRoute) {
        // Execute the listener route with the result of the source route
        processRoute(listenerRoute, result).catch(err => {
          console.error(`Error executing listener route ${listenerRouteName}:`, err);
        });
      }
    });
  }
  
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

export default {
  onException: retry.onException,
  to,
  toRoute,
  from,
  init,
  end,
  getRoutes: () => routes,
  sendMessage,
};
