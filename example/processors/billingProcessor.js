export default exchange => {
    var order = exchange
    order.billed = true
    return Promise.resolve(order)
}