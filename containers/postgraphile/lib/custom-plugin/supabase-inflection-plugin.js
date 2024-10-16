"use strict";
const graphile_utils_1 = require("graphile-utils");
module.exports = (0, graphile_utils_1.makeAddInflectorsPlugin)({
    allRows(table) {
        //@ts-ignore
        return this.camelCase(`${this.pluralize(this._singularizedTableName(table))}-collection`);
    },
}, true);
