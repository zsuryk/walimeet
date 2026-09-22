var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-VPBJoL/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/nanoid/url-alphabet/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// node_modules/nanoid/index.browser.js
var nanoid = /* @__PURE__ */ __name((size = 21) => {
  let id = "";
  let bytes = crypto.getRandomValues(new Uint8Array(size |= 0));
  while (size--) {
    id += urlAlphabet[bytes[size] & 63];
  }
  return id;
}, "nanoid");

// worker/lib/id.ts
function generatePollId() {
  return nanoid(10);
}
__name(generatePollId, "generatePollId");

// worker/lib/kv.ts
async function getPoll(kv, id) {
  const data = await kv.get(`poll:${id}`, "json");
  return data;
}
__name(getPoll, "getPoll");
async function savePoll(kv, poll) {
  const ttl = Math.ceil((poll.expiresAt - Date.now()) / 1e3);
  await kv.put(`poll:${poll.id}`, JSON.stringify(poll), {
    expirationTtl: Math.max(ttl, 60)
  });
}
__name(savePoll, "savePoll");

// worker/routes/create.ts
async function handleCreatePoll(request, env) {
  const input = await request.json();
  if (!input.name || !input.dates?.length || !input.timeRange) {
    return new Response("Invalid input", { status: 400 });
  }
  const now = Date.now();
  const poll = {
    id: generatePollId(),
    name: input.name,
    description: input.description || "",
    dates: input.dates,
    timeRange: input.timeRange,
    timezone: input.timezone || "UTC",
    slotMinutes: 15,
    creatorName: input.creatorName || "Anonymous",
    createdAt: now,
    expiresAt: now + input.expiryDays * 24 * 60 * 60 * 1e3,
    responses: {}
  };
  await savePoll(env.WALIMEET_KV, poll);
  return new Response(JSON.stringify(poll), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleCreatePoll, "handleCreatePoll");

// worker/routes/poll.ts
async function handleGetPoll(request, env, pollId) {
  const poll = await getPoll(env.WALIMEET_KV, pollId);
  if (!poll) {
    return new Response("Poll not found", { status: 404 });
  }
  if (Date.now() > poll.expiresAt) {
    return new Response("Poll expired", { status: 410 });
  }
  return new Response(JSON.stringify(poll), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetPoll, "handleGetPoll");

// worker/routes/respond.ts
async function handleRespond(request, env, pollId) {
  const input = await request.json();
  if (!input.name || !input.availabilities) {
    return new Response("Invalid input", { status: 400 });
  }
  const poll = await getPoll(env.WALIMEET_KV, pollId);
  if (!poll) {
    return new Response("Poll not found", { status: 404 });
  }
  if (Date.now() > poll.expiresAt) {
    return new Response("Poll expired", { status: 410 });
  }
  const responseKey = input.name.toLowerCase().trim();
  const response = {
    name: input.name.trim(),
    availabilities: input.availabilities,
    submittedAt: Date.now()
  };
  poll.responses[responseKey] = response;
  await savePoll(env.WALIMEET_KV, poll);
  return new Response(JSON.stringify(poll), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleRespond, "handleRespond");

// worker/index.ts
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    try {
      let response;
      if (request.method === "POST" && path === "/api/poll") {
        response = await handleCreatePoll(request, env);
      } else if (request.method === "GET" && path.startsWith("/api/poll/")) {
        const pollId = path.split("/api/poll/")[1];
        response = await handleGetPoll(request, env, pollId);
      } else if (request.method === "PUT" && path.startsWith("/api/poll/") && path.endsWith("/respond")) {
        const pollId = path.split("/api/poll/")[1].split("/")[0];
        response = await handleRespond(request, env, pollId);
      } else {
        response = new Response("Not found", { status: 404 });
      }
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal error", {
        status: 500,
        headers
      });
    }
  }
};

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-VPBJoL/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-VPBJoL/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
