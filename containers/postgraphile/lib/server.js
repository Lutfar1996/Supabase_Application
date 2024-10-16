"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_xray_sdk_1 = __importDefault(require("aws-xray-sdk"));
const fastify_1 = __importDefault(require("fastify"));
const fastify_graceful_shutdown_1 = __importDefault(require("fastify-graceful-shutdown"));
const fastify_healthcheck_1 = __importDefault(require("fastify-healthcheck"));
const fastify_xray_1 = __importDefault(require("fastify-xray"));
const postgraphile_1 = require("postgraphile");
const port = Number(process.env.PORT || '5000');
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/postgres';
const schema = process.env.DATABASE_SCHEMA || 'public';
const enableXrayTracing = (process.env.ENABLE_XRAY_TRACING == 'true') ? true : false; // default: false
const middleware = (0, postgraphile_1.postgraphile)(databaseUrl, schema, {
    watchPg: (process.env.PG_WATCH == 'false') ? false : true,
    graphiql: (process.env.PG_GRAPHIQL == 'false') ? false : true,
    enhanceGraphiql: (process.env.PG_ENHANCE_GRAPHIQL == 'false') ? false : true,
    dynamicJson: (process.env.PG_DYNAMIC_JSON == 'false') ? false : true,
    ignoreRBAC: (process.env.PG_IGNORE_RBAC == 'false') ? false : true,
    jwtSecret: process.env.JWT_SECRET,
    jwtVerifyOptions: {
        audience: process.env.JWT_VERIFY_AUDIENCE?.split(',') || [],
    },
    appendPlugins: [
    //supabaseInflectionPlugin,
    ],
});
const fastify = (0, fastify_1.default)({ logger: true });
fastify.register(fastify_graceful_shutdown_1.default).after((err) => console.error(err));
fastify.register(fastify_healthcheck_1.default).after((err) => console.error(err));
fastify.addHook('onRoute', (opts) => {
    if (opts.path === '/health') {
        opts.logLevel = 'error';
    }
});
if (enableXrayTracing) {
    aws_xray_sdk_1.default.middleware.setSamplingRules({
        rules: [
            {
                description: 'Health check',
                host: '*',
                http_method: 'GET',
                url_path: '/health',
                fixed_target: 0,
                rate: 0.0,
            },
        ],
        default: { fixed_target: 1, rate: 1.0 },
        version: 2,
    });
    aws_xray_sdk_1.default.config([aws_xray_sdk_1.default.plugins.ECSPlugin]);
    fastify.register(fastify_xray_1.default, { defaultName: 'PostGraphile' }).after((err) => console.error(err));
}
const convertHandler = (handler) => (request, reply) => handler(new postgraphile_1.PostGraphileResponseFastify3(request, reply));
// OPTIONS requests, for CORS/etc
fastify.options(middleware.graphqlRoute, convertHandler(middleware.graphqlRouteHandler));
// This is the main middleware
fastify.post(middleware.graphqlRoute, convertHandler(middleware.graphqlRouteHandler));
// GraphiQL, if you need it
if (middleware.options.graphiql) {
    if (middleware.graphiqlRouteHandler) {
        fastify.head(middleware.graphiqlRoute, convertHandler(middleware.graphiqlRouteHandler));
        fastify.get(middleware.graphiqlRoute, convertHandler(middleware.graphiqlRouteHandler));
    }
    // Remove this if you don't want the PostGraphile logo as your favicon!
    if (middleware.faviconRouteHandler) {
        fastify.get('/favicon.ico', convertHandler(middleware.faviconRouteHandler));
    }
}
// If you need watch mode, this is the route served by the
if (middleware.options.watchPg) {
    if (middleware.eventStreamRouteHandler) {
        fastify.options(middleware.eventStreamRoute, convertHandler(middleware.eventStreamRouteHandler));
        fastify.get(middleware.eventStreamRoute, convertHandler(middleware.eventStreamRouteHandler));
    }
}
fastify.listen({ port, host: '0.0.0.0' })
    .then((address) => fastify.log.info(`PostGraphiQL available at ${address}${middleware.graphiqlRoute} 🚀`))
    .catch(err => fastify.log.error(err));
