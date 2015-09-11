var fs = require("fs");
var UsersService_1 = require("./UsersService");
/**
* A simple wrapper that holds information on each path the server can respond to.
* If the server detects a template route is possible it uses that as a preference
* to a static one.
*/
var PathHandler = (function () {
    /**
    * Creates a new path handler
    * @param {IPath}
    * @param {IServer}
    */
    function PathHandler(path, cfg) {
        this._path = path;
        this._config = cfg;
    }
    /**
    * Function used to handle a request from express
    * @param {IPath}
    * @param {ServerConfig}
    */
    PathHandler.prototype.handle = function (req, res) {
        var config = this._config;
        var path = this._path;
        var requestIsSecure = (req.connection.encrypted || req.headers["x-forwarded-proto"] == "https" ? true : false);
        var url = (requestIsSecure ? "https" : "http") + "://" + config.host;
        var usersURL = "" + UsersService_1.UsersService.usersURL;
        var options = { usersURL: usersURL, url: url };
        if (path.plugins)
            options.plugins = ["/admin/plugins/app-engine/plugin.js"]; //path.plugins;
        else
            options.plugins = [];
        // Give priority to template routes
        if (path.templatePath && path.templatePath != "" && fs.existsSync(path.templatePath + "/" + path.index + ".jade"))
            res.render(path.templatePath + "/" + path.index, options);
        else
            res.sendfile(path.index);
    };
    ;
    return PathHandler;
})();
exports.PathHandler = PathHandler;