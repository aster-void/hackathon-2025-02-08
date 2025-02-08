const is_array = Array.isArray;
const index_of = Array.prototype.indexOf;
const array_from = Array.from;
const define_property = Object.defineProperty;
const get_descriptor = Object.getOwnPropertyDescriptor;
const noop = () => {};
function equals(value) {
	return value === this.v;
}
function safe_not_equal(a, b) {
	return a !== a
		? b === b
		: a !== b ||
				(a !== null && typeof a === "object") ||
				typeof a === "function";
}
function safe_equals(value) {
	return !safe_not_equal(value, this.v);
}
const HYDRATION_START = "[";
const HYDRATION_END = "]";
const HYDRATION_ERROR = {};
function lifecycle_outside_component(name) {
	throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
let current_component = null;
function getContext(key) {
	const context_map = get_or_init_context_map();
	const result =
		/** @type {T} */
		context_map.get(key);
	return result;
}
function setContext(key, context) {
	get_or_init_context_map().set(key, context);
	return context;
}
function get_or_init_context_map(name) {
	if (current_component === null) {
		lifecycle_outside_component();
	}
	return (current_component.c ??= new Map(
		get_parent_context(current_component) || void 0,
	));
}
function push(fn) {
	current_component = { p: current_component, c: null, d: null };
}
function pop() {
	const component =
		/** @type {Component} */
		current_component;
	const ondestroy = component.d;
	if (ondestroy) {
		on_destroy.push(...ondestroy);
	}
	current_component = component.p;
}
function get_parent_context(component_context) {
	let parent = component_context.p;
	while (parent !== null) {
		const context_map = parent.c;
		if (context_map !== null) {
			return context_map;
		}
		parent = parent.p;
	}
	return null;
}
const BLOCK_OPEN = `<!--${HYDRATION_START}-->`;
const BLOCK_CLOSE = `<!--${HYDRATION_END}-->`;
let on_destroy = [];
function render(component, options = {}) {
	const payload = {
		out: "",
		css: /* @__PURE__ */ new Set(),
		head: { title: "", out: "" },
	};
	const prev_on_destroy = on_destroy;
	on_destroy = [];
	payload.out += BLOCK_OPEN;
	if (options.context) {
		push();
		current_component.c = options.context;
	}
	component(payload, options.props ?? {}, {}, {});
	if (options.context) {
		pop();
	}
	payload.out += BLOCK_CLOSE;
	for (const cleanup of on_destroy) cleanup();
	on_destroy = prev_on_destroy;
	let head = payload.head.out + payload.head.title;
	for (const { hash, code } of payload.css) {
		head += `<style id="${hash}">${code}</style>`;
	}
	return {
		head,
		html: payload.out,
		body: payload.out,
	};
}

const internal = new URL("sveltekit-internal://");
function resolve(base, path) {
	if (path[0] === "/" && path[1] === "/") return path;
	let url = new URL(base, internal);
	url = new URL(path, url);
	return url.protocol === internal.protocol
		? url.pathname + url.search + url.hash
		: url.href;
}
function normalize_path(path, trailing_slash) {
	if (path === "/" || trailing_slash === "ignore") return path;
	if (trailing_slash === "never") {
		return path.endsWith("/") ? path.slice(0, -1) : path;
	}
	if (trailing_slash === "always" && !path.endsWith("/")) {
		return `${path}/`;
	}
	return path;
}
function decode_pathname(pathname) {
	return pathname.split("%25").map(decodeURI).join("%25");
}
function decode_params(params) {
	for (const key in params) {
		params[key] = decodeURIComponent(params[key]);
	}
	return params;
}
function make_trackable(
	url,
	callback,
	search_params_callback,
	allow_hash = false,
) {
	const tracked = new URL(url);
	Object.defineProperty(tracked, "searchParams", {
		value: new Proxy(tracked.searchParams, {
			get(obj, key) {
				if (key === "get" || key === "getAll" || key === "has") {
					return (param) => {
						search_params_callback(param);
						return obj[key](param);
					};
				}
				callback();
				const value = Reflect.get(obj, key);
				return typeof value === "function" ? value.bind(obj) : value;
			},
		}),
		enumerable: true,
		configurable: true,
	});
	const tracked_url_properties = [
		"href",
		"pathname",
		"search",
		"toString",
		"toJSON",
	];
	if (allow_hash) tracked_url_properties.push("hash");
	for (const property of tracked_url_properties) {
		Object.defineProperty(tracked, property, {
			get() {
				callback();
				return url[property];
			},
			enumerable: true,
			configurable: true,
		});
	}
	tracked[Symbol.for("nodejs.util.inspect.custom")] = (
		depth,
		opts,
		inspect,
	) => {
		return inspect(url, opts);
	};
	tracked.searchParams[Symbol.for("nodejs.util.inspect.custom")] = (
		depth,
		opts,
		inspect,
	) => {
		return inspect(url.searchParams, opts);
	};
	if (!allow_hash) {
		disable_hash(tracked);
	}
	return tracked;
}
function disable_hash(url) {
	allow_nodejs_console_log(url);
	Object.defineProperty(url, "hash", {
		get() {
			throw new Error(
				"Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead",
			);
		},
	});
}
function disable_search(url) {
	allow_nodejs_console_log(url);
	for (const property of ["search", "searchParams"]) {
		Object.defineProperty(url, property, {
			get() {
				throw new Error(
					`Cannot access url.${property} on a page with prerendering enabled`,
				);
			},
		});
	}
}
function allow_nodejs_console_log(url) {
	url[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
		return inspect(new URL(url), opts);
	};
}
const subscriber_queue = [];
function readable(value, start) {
	return {
		subscribe: writable(value, start).subscribe,
	};
}
function writable(value, start = noop) {
	let stop = null;
	const subscribers = /* @__PURE__ */ new Set();
	function set(new_value) {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) {
				const run_queue = !subscriber_queue.length;
				for (const subscriber of subscribers) {
					subscriber[1]();
					subscriber_queue.push(subscriber, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}
	function update(fn) {
		set(
			fn(
				/** @type {T} */
				value,
			),
		);
	}
	function subscribe(run, invalidate = noop) {
		const subscriber = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set, update) || noop;
		}
		run(
			/** @type {T} */
			value,
		);
		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0 && stop) {
				stop();
				stop = null;
			}
		};
	}
	return { set, update, subscribe };
}
const valid_layout_exports = /* @__PURE__ */ new Set([
	"load",
	"prerender",
	"csr",
	"ssr",
	"trailingSlash",
	"config",
]);
/* @__PURE__ */ new Set([...valid_layout_exports, "entries"]);
const valid_layout_server_exports = /* @__PURE__ */ new Set([
	...valid_layout_exports,
]);
/* @__PURE__ */ new Set([...valid_layout_server_exports, "actions", "entries"]);

export {
	HYDRATION_START as H,
	HYDRATION_ERROR as a,
	HYDRATION_END as b,
	array_from as c,
	define_property as d,
	equals as e,
	index_of as f,
	get_descriptor as g,
	setContext as h,
	is_array as i,
	pop as j,
	decode_pathname as k,
	decode_params as l,
	disable_search as m,
	normalize_path as n,
	resolve as o,
	push as p,
	make_trackable as q,
	render as r,
	safe_equals as s,
	readable as t,
	getContext as u,
	noop as v,
	writable as w,
};
//# sourceMappingURL=exports-CGNrczm9.js.map
