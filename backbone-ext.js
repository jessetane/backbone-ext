//
//  Backbone extensions
//
//


// LinkRouter
// ----------

Backbone.LinkRouter = Backbone.Router.extend({
  
  constructor: function () {
    Backbone.Router.prototype.constructor.call(this);
    var _this = this;
    $("a").live("click", function (evt) {
      _this.linkEvent = evt;
      var target = $(evt.currentTarget);
      var url = target.attr("href");
      if (!target.attr("data-method")) {
        fragment = Backbone.history.getFragment(url);
        matched = _.any(Backbone.history.handlers, function (handler) {
          if (handler.route.test(fragment)) return true;
        });
        if (matched) _this.navigate(url, { trigger: true });
      }
    });
  }
  
});


// A Cache helper object
// ---------------------

Backbone.cache = {

    cacheTypes : {},

    registerType : function(typeName, expiryObject, expiryKey) {
        Backbone.cache.cacheTypes[typeName] = {
            "expiryObject" : expiryObject,
            "expiryKey" : expiryKey,
        };
    },

    generateKey : function(cacheKey, cacheType) {
        var ctype = this.cacheTypes[cacheType];
        return cacheType + cacheKey + ctype.expiryObject[ctype.expiryKey];
    },

    verify : function(cacheKey, cacheType) {
        var ckey = Backbone.cache.generateKey(cacheKey, cacheType);
        var valid = false;
        for(var key in localStorage) {
            if(key == ckey) {
                valid = true;
                break;
            }
        }
        return valid;
    },

    load : function(cacheKey, cacheType) {
        var ckey = Backbone.cache.generateKey(cacheKey, cacheType);
        return JSON.parse(localStorage.getItem(ckey));
    },

    save : function(objectToCache, cacheKey, cacheType) {
        var ckey = Backbone.cache.generateKey(cacheKey, cacheType);
        return localStorage.setItem(ckey, JSON.stringify(objectToCache));
    },

    clear : function(cacheKey, cacheType) {
        var ckey = Backbone.cache.generateKey(cacheKey, cacheType);
        return localStorage.removeItem(ckey);
    }
};


// Backbone.Model customization
// ----------------------------

/*
Backbone.Model.prototype._save = Backbone.Model.prototype.save;
Backbone.Model.prototype.save = function(attrs, options) {
    this.fieldsToSave = attrs;
    var s = this._save(attrs, options);
    if(!s) delete this.fieldsToSave;
    return s;
};

Backbone.Model.prototype.update = function (attrs, options) {
    options || (options = {});
    var t = this;
    var collection = this.collection;
    var old = _.copy(this.attributes);
    this.save(attrs, {
        silent : true,
        error : function (m, xhr) {
            _.log("error");
            var res = null;
            if(xhr && xhr.responseText) {
                try {
                    res = JSON.parse(xhr.responseText);
                } catch (e) {};
            }
            if (res) m.set(res);
            else m.set(old);
            if (options.error) options.error(m, xhr);
            if (res && options.revertOnError) m.set(old, { silent : true });
        },
        success : function (m) {
            _.log("success");
            if(m.collection) m.collection.recache();
            if(options.success) options.success(m);
            m.change(); // need manual call as we orginally set atts to update silently
        }
    });
};

// handy function that will recursively transform nested
// hashes and arrays for rails' update_attributes method
Backbone.Model.prototype.nestForRails = function (obj) {
    for (var f in obj) {
        if (obj[f] == null) {
            delete obj[f];
            continue;
        }
        var ctor = obj[f].constructor;
        var sctor = obj.constructor;
        if ((ctor == Object || ctor == Array)) {
            if (f == "ui") {
                delete obj[f];
            } else if (f.search("value") == -1) {
                this.nestForRails(obj[f]);
                if (sctor != Array) {
                    obj[f + "_attributes"] = obj[f];
                    delete obj[f];
                }
            }
        }
    }
    return obj;
};

Backbone.Model.prototype.toJSON = function() {
    var fieldsToSave = (this.fieldsToSave) ? _.copy(this.fieldsToSave) : _.copy(this.attributes);
    return this.nestForRails(fieldsToSave);
};
*/


// Backbone.Collection customization
// ---------------------------------

Backbone.Collection.prototype._fetch = Backbone.Collection.prototype.fetch;
Backbone.Collection.prototype.fetch = function (options) {

  // return early if already fetching from the server
  if (this.fetching) {
    _.log("already fetching!");
    return true;
  }

  if (this.cacheKey) {
    options || (options = {});
    if (!options.refresh && Backbone.cache.verify(this.cacheKey, this.cacheType)) {
      if (this.models.length != 0) {
        if (options.success) options.success(this, models);
        return false;
      } else {
        var models = Backbone.cache.load(this.cacheKey, this.cacheType)
        this[options.add ? "add" : "reset"](models, options);
        if (options.success) options.success(this, models);
        return false;
      }
    } else {
      _.log("fetching from server");
      this.fetching = true;
      var t = this;
      var success = options.success;
      var error = options.error;
      var fetchComplete = function (collection, e) {
        _.log("fetch complete!");
        t.fetching = false;
      };
      options.success = function (collection, resp, xhr) {
        Backbone.cache.save(resp, collection.cacheKey, collection.cacheType);
        fetchComplete();
        if (success) success(collection, resp);
      };
      options.error = function (collection, resp, xhr) {
        fetchComplete();
        if (error) error(collection, resp);
      };
      return this._fetch(options);
    }
  } else {
    _.log("fetching from server");
    return this._fetch(options);
  }
};

Backbone.Collection.prototype.recache = function () {
  if (!this.cacheKey || !this.cacheType) return;
  var list = [];
  var json = this.map(function (model) { list.push(model); return model.attributes; });
  Backbone.cache.save(json, this.cacheKey, this.cacheType);
};

Backbone.Collection.prototype.getByAttr = function(key, val) {
  return this.detect(function (model) {
    if (_.isString(val)) return model.get(key).toLowerCase() == val.toLowerCase();
    return model.get(key) == val;
  });
};
