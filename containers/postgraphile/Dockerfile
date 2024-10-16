FROM public.ecr.aws/docker/library/node:18-alpine AS build

WORKDIR /postgraphile/
COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY ./src ./src
RUN npm run build

# Second stage: Install production dependencies
FROM public.ecr.aws/docker/library/node:18-alpine AS module

WORKDIR /postgraphile/
COPY package.json ./
RUN npm install --production --cache /tmp/empty-cache && rm -rf /tmp/empty-cache

# Final stage: Build the final image
FROM public.ecr.aws/docker/library/node:18-alpine

WORKDIR /postgraphile/
COPY package.json ./
COPY --from=module /postgraphile/node_modules/ ./node_modules/
COPY --from=build /postgraphile/lib/ ./

ENV AWS_XRAY_CONTEXT_MISSING=LOG_ERROR

# Optional healthcheck (commented out)
# HEALTHCHECK --interval=5s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

EXPOSE 5000
CMD [ "node", "--require", "module-alias/register", "server.js" ]

