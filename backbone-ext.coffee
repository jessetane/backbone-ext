#
#   cache.coffee | 2012
#   handles teh offline action
#

class Cache
  
  constructor: (prefix) ->
    @prefix = prefix
  
  verify: (key) =>
    key = @prefix + key
    valid = false
    for ckey in localStorage
      if ckey == key
        valid = true
        break
    return valid
  
  load: (key) =>
    return JSON.parse localStorage.getItem @prefix + key
    
  save: (val, key) =>
    return localStorage.setItem @prefix + key, JSON.stringify val
    
  clear: (key) =>
    return localStorage.removeItem key

# add an instance to the Model prototype and set its prefix
Backbone.Model::cache = new Cache "Model"


#
#   Model overrides
#
#

Backbone.Model::_fetch = Backbone.Model::fetch
Backbone.Model::fetch = (opts) ->
  
  # return early, request in progress
  if @fetching then return
  
  opts ?= {}
  success = opts.success
  error = opts.error
  opts.success = (data) =>
    @fetching = false
    @cache.save data, @url
    success? arguments
  opts.error = =>
    @fetching = false
    data = @cache.load @url
    if data?
      success? data
    else 
      error? arguments
  @._fetch opts


#
#   LinkRouter subclass
#
#

Backbone.LinkRouter = class extends Backbone.Router
  
  constructor: ->
    super()
    $("a").live "click", (evt) =>
      @linkEvent = evt
      target = $ evt.currentTarget
      url = target.attr "href"
      if !url? then return
      fragment = Backbone.history.getFragment url;
      matched = _.any Backbone.history.handlers, (handler) ->
        if handler.route.test fragment then return true
      if matched
        @navigate url, { trigger: true }
