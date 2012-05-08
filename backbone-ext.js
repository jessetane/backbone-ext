//
//
//
//

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
