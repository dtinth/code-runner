

function PortManager(name) {
  var o = {}
    , map = {}
    , next = 0
  o.onmessage = function(e) {
    var data = e.data
    if (map[data.port]) map[data.port](data)
  }
  o.port = function(callback) {
    var id = 'port' + '_' + name + '_' + (next++)
    var connection = {
      close: function() { delete map[id] }
    , port: id
    }
    map[id] = function(e) {
      callback.call(connection, e)
    }
    return id
  }
  return o
}

function CodeRunner() {

  var runner = {}
    , server = function() {
        var __lnr = -1
        var __evals = function() {
          var __out = undefined
          for (var __index = 0; __index < arguments.length; __index ++) {
            if (__lnr === -1) __lnr = new Error().lineNumber
            __out = eval(arguments[__index])
          }
          return __out
        }
        ;(function() {
          var portManager = new PortManager('worker')
          var createPort = function(port) {
            return function() {
              self.postMessage({
                port: port,
                arguments: [].slice.call(arguments).map(mapArgument)
              })
            }
          }
          var mapArgument = function(arg) {
            if (typeof arg != 'function') return arg
            return {
              '#$port': portManager.port(function(data) {
                if (data.close) {
                  this.close()
                } else {
                  arg.apply(null, data.arguments)
                }
              }),
              'code': arg.toString()
            }
          }
          self.onmessage = function(e) {
            portManager.onmessage(e)
            var data = e.data
            if (data.action == 'eval') {
              var out = { port: data.port }
              try {
                out.result = __evals.apply(null, data.code)
              } catch (e) {
                out.error = e.toString()
                if (__lnr != null && __lnr != -1) {
                  out.error += ' (line ' + (e.lineNumber - __lnr) + ')'
                } else if (typeof e.stack == 'string') {
                  var match = e.stack.match(/anonymous>:(\d+)/)
                  if (match) out.error += ' (line ' + match[1] + ')'
                }
              }
              self.postMessage(out)
            } else if (data.action == 'register') {
              if (data.port != null) {
                self[data.name] = createPort(data.port)
              } else if (data.code != null) {
                self[data.name] = eval('(' + data.code + ')')
              }
            }
          }
        })()
      }
    , blob = new Blob([
        'var PortManager = ', PortManager.toString(), ';'
      , '((', server.toString(), ')());'
      ], { type: "text/javascript" })

  var remoteMethods = []
    , workerMethods = []

  runner.run = function(code, callback) {
    if (typeof code == 'string') code = [code]
    var worker = new Worker((window.URL || window.webkitURL).createObjectURL(blob))
    var portManager = new PortManager('host')
    var sendback = function() {
          if (callback == null) return
          var ret = callback.apply(this, arguments)
          callback = null
          if (ret !== false) worker.terminate()
          if (timeout != null) clearTimeout(timeout)
        }
    var timeout
    worker.onmessage = portManager.onmessage
    remoteMethods.forEach(function(m) {
      worker.postMessage({
        action: 'register',
        name: m.name,
        port: portManager.port(function(data) {
          m.fn.apply(null, data.arguments.map(mapArguments))
        })
      })
    })
    workerMethods.forEach(function(m) {
      worker.postMessage({
        action: 'register',
        name: m.name,
        code: m.fn.toString()
      })
    })
    var mapArguments = function(arg) {
          if (typeof arg != 'object' || !('#$port' in arg)) return arg
          var port = arg['#$port']
          var f = function() {
            worker.postMessage({
              port: port
            , arguments: [].slice.call(arguments)
            })
          }
          f.code = arg.code
          f.close = function() {
            worker.postMessage({
              port: port
            , close: true
            })
          }
          return f
        }
    worker.postMessage({
      action: 'eval',
      code: code,
      port: portManager.port(function(data) {
        this.close()
        if (data.error) {
          sendback(data.error)
        } else {
          sendback(null, data.result)
        }
      })
    })
    if (runner.timeout) {
      setTimeout(function() {
        sendback(new Error("Timed out!!~"))
      }, runner.timeout)
    }
    return worker
  }

  runner.register = function(name, fn) {
    remoteMethods.push({ name: name, fn: fn })
  }
  runner.registerWorker = function(name, fn) {
    workerMethods.push({ name: name, fn: fn })
  }

  return runner

}
