"use strict";
const winston = require("winston");
const controller_1 = require("./controller");
/**
* Checks all incomming requests to see if they are CORS approved
*/
class CORSController extends controller_1.Controller {
    /**
    * Creates an instance of the user manager
    * @param {mongodb.Collection} userCollection The mongo collection that stores the users
    * @param {mongodb.Collection} sessionCollection The mongo collection that stores the session data
    * @param {def.IConfig} The config options of this manager
    */
    constructor(e, config) {
        super(null);
        var matches = [];
        for (var i = 0, l = config.approvedDomains.length; i < l; i++)
            matches.push(new RegExp(config.approvedDomains[i]));
        // Approves the valid domains for CORS requests
        e.use(function (req, res, next) {
            if (req.headers.origin) {
                var matched = false;
                for (var m = 0, l = matches.length; m < l; m++)
                    if (req.headers.origin.match(matches[m])) {
                        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Mime-Type, X-File-Name, Cache-Control');
                        res.setHeader("Access-Control-Allow-Credentials", "true");
                        matched = true;
                        break;
                    }
                if (!matched)
                    winston.error(`${req.headers.origin} Does not have permission. Add it to the allowed `, { process: process.pid });
            }
            if (req.method === 'OPTIONS') {
                res.status(200);
                res.end();
            }
            else
                next();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CORSController;
