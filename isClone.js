// Borrow some ideas from:
// https://stackoverflow.com/a/44827922
// https://stackoverflow.com/a/16788517
// https://stackoverflow.com/a/1144249
// https://stackoverflow.com/a/6713782
// https://github.com/othiym23/node-deeper/blob/master/index.js
// http://jsfiddle.net/mendesjuan/uKtEy/1/
// https://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable

'use strict'
function getAllPropertyNames(obj) {
  const s = new Set()
  do {
      Object.getOwnPropertyNames(obj).forEach(p => { s.add(p) })
  } while (obj = Object.getPrototypeOf(obj))
  return [...s]
}

const isIterable = obj => obj && typeof obj[Symbol.iterator] === 'function'
const objtypeOf = obj => obj && obj.constructor

const isClone = (x, y, { debug = false, strictly = true  } = {}) => {
  const exist = new Map()
  const logger = debug ? console : { log: () => {} }
  const _isClone = (x, y, spaces = '') => {
    const tab = spaces
    spaces += '  '
    function _FALSE(cond) {
      logger.log(`${tab} false <= ${cond} :`, x, ' <=> ', y)
      return false
    }
    function _TRUE(cond) {
      logger.log(`${tab} true <= ${cond} :`, x, ' <=> ', y)
      return true
    }
    const _RETURN = (bool, line) => {
      return bool ? _TRUE(line) : _FALSE(line)
    }

    if (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y)) {
      return _TRUE(1)
    }

    // Compare primitives and same objects (Objects assign by reference, not cloned).
    if (x === y) { return _TRUE('x === y') }
    if (!(x instanceof Object)) { return _FALSE('x is not an obj') }
    if (!(y instanceof Object)) { return _FALSE('y is not an obj') }
    if (x.length !== y.length) { return _FALSE('x.length !== y.length') }
    if (x.size !== y.size) { return _FALSE('x.size !== y.size') }
    if (x.constructor !== y.constructor) { return _FALSE('x.constructor !== y.constructor') }
    // At this point x and y have the same type. So we don't need to duplicate tests for x and y hereinafter

    if (!strictly && typeof x === 'function') {
      // Usually two functions are the same if they refere the same code (in same context)
      // ... but in order two compare if two comapre thow function in a relaxed way we may compare code character by character
      return _RETURN(x.toString() === y.toString(), `Function (non strict mode): x.toString() === y.toString()`)
    }

    if (x.prototype !== y.prototype) { return _FALSE('x.prototype !== y.prototype') }

    const objtype = objtypeOf(x) // We shouldn't use/compare "instanceof" as it includes subclasses
    if (objtype === String || objtype === Number || objtype === Boolean) {
      return _RETURN(x.toString() === y.toString(), `${objtype.name}: x.toString() === y.toString()`)
    }
    if (objtype === Date) {
      // Never use .tostring() for a Date object. It may(?) discard milliseconds
      return _RETURN(x.getTime() === y.getTime(), 'Date: x.getTime() === y.getTime()')
    }

    if (exist.has(x) || exist.has(y)) { // Check if we are in a cyclical case
      const a = exist.get(x)
      const b = exist.get(y)
      return _RETURN(a === b || (a === y && b === x), 'exist.get(x) === exist.get(y)')
    }
    exist.set(x, y)
    exist.set(y, x)
    // Now compare prototypes
    const px = Object.getPrototypeOf(x)
    const py = Object.getPrototypeOf(y)
    if (!_isClone(px, py, tab)) { return _FALSE('Prototypes are different') }

    // Compare every properties
    const props = new Set([...getAllPropertyNames(x), ...getAllPropertyNames(y)])
    const check = [...props].every(p => _isClone(x[p], y[p], tab))
    if (!check) return _FALSE("At least one property doesn't match")

    const iterable = isIterable(x)
    if (iterable && !(x instanceof String)) { //iterate except if x is a Strings
      const [xo, yo] = [ [...x], [...y] ]
      const check = xo.every((v, i) => _isClone(v, yo[i], tab))
      if (!check) { return _FALSE('At least one iterable value is not equal') }
    }

    if(x instanceof String || x instanceof RegExp || x instanceof Number  || x instanceof Boolean) {
      return _RETURN(x.toString() === y.toString(), `Every property match and x.toString() === y.toString()`)
    }
    if(x instanceof Date) {
      return _RETURN(x.getTime() === y.getTime(), `Every property match and x.getTime() === y.getTime()`)
    }
    if(props.size > 0 || iterable || x instanceof Function ) {
      return _TRUE(`Every property and/or member match`)
    }

    // last attempt if we forget some "special" case or object has no properties at all
    const result = x.toString() === y.toString()
    return _RETURN(result, 'Last attempt using "x.toString() === y.toString()"')
  }
  return _isClone(x,y)
}

module.exports = isClone