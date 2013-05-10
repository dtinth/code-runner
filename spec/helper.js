
var within = function(timeout) {
  return {
    it: function(what, code) {
      it(what, function() {
        var done = false
          , error = null
        runs(function() {
          code(function(what) { done = true; error = what })
        })
        waitsFor(function() { return done }, timeout)
        runs(function() {
          if (error) throw error
        })
      })
    }
  }
}

var async = within(1000)
