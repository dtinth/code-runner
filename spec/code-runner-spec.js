describe("CodeRunner", function() {

  var runner

  beforeEach(function() {
    runner = new CodeRunner()
  })

  async.it("should run a code and return value as number", function(done) {

    // when running with callback, worker is automatically terminated.
    runner.run('1234', function(error, value) {
      if (error) return done(error)
      expect(value).toBe(1234)
      done()
    })

  })

  async.it("should run a code and return value as string", function(done) {
    runner.run('"1234"', function(error, value) {
      if (error) return done(error)
      expect(value).toBe("1234")
      done()
    })
  })

  async.it("should run a code and return value as array", function(done) {
    runner.run('[1, 2+3, "4", 5]', function(error, value) {
      if (error) return done(error)
      expect(value).toEqual([1, 2+3, "4", 5])
      done()
    })
  })

  async.it("should run a code and return value as object", function(done) {
    runner.run('({a:"1"})', function(error, value) {
      if (error) return done(error)
      expect(value.a).toBe("1")
      done()
    })
  })

  async.it("should run a code and return null", function(done) {
    runner.run('null', function(error, value) {
      if (error) return done(error)
      expect(value).toBe(null)
      done()
    })
  })

  async.it("should run a code and return undefined", function(done) {
    runner.run('void 0', function(error, value) {
      if (error) return done(error)
      expect(value).toBe(undefined)
      done()
    })
  })
  
  async.it("should not run a code forever", function(done) {
    runner.timeout = 50
    runner.run('for(;;){}', function(error, value) {
      if (error) {
        return done()
      }
      done(new Error('no error'))
    })
  })

  async.it("should report an error when an error is raised", function(done) {
    runner.run('alert()', function(error, value) {
      expect(error).toMatch(/alert/)
      done()
    })
  })

  async.it("should report an error with line number", function(done) {
    runner.run('alert()', function(error, value) {
      expect(error).toMatch(/line 1/)
      done()
    })
  })
  async.it("should report an error with line number", function(done) {
    runner.run('\n\nalert()', function(error, value) {
      expect(error).toMatch(/line 3/)
      done()
    })
  })

  async.it("should allow remote method", function(done) {
    runner.register('hello', function(x) {
      expect(x).toBe(123)
      done()
    })
    runner.run('hello(123)', function(error, value) {
      if (error) return done(error)
    })
  })

  async.it("should allow remote method with callback", function(done) {
    runner.register('ask', function(fn) {
      fn('hi!!')
      fn.close()
    })
    runner.register('ok', function(data) {
      expect(data).toBe('hi!!')
      done()
      worker.terminate()
    })
    var worker = runner.run('ask(function(result) { ok(result) })')
  })

  async.it("should show parse errors", function(done) {
    runner.run('\n\n\n\nalert)', function(error, value) {
      expect(error).toBeTruthy()
      done()
    })
  })

  async.it("should allow multiple code to be run", function(done) {
    runner.run(['var a = 5', 'a'], function(error, value) {
      if (error) return done(error)
      expect(value).toBe(5)
      done()
    })
  })

  async.it("should allow a function to be registered on the worker", function(done) {
    runner.registerWorker('test', function() {
      return !!self
    })
    runner.run('test()', function(error, value) {
      if (error) return done(error)
      expect(value).toBe(true)
      done()
    })
  })

})










