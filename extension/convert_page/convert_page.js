
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const apiKey = "AIzaSyCsSMdQaKUyK5AfRbmuuJ_lap9b7CDLccg";

    const colors = {
        "Pavone": "7",
        "Pomodoro": "11",
        "Fenicottero": "4",
        "Mandarino": "6",
        "Banana": "5",
        "Salvia": "2",
        "Basilico": "10",
        "Mirtillo": "9",
        "Lavanda": "1",
        "Vinaccia": "3",
        "Grafite": "8",
    };

    function minsToTime(mins) {
        // Converts # minutes after 08:00 to time
        let hours = Math.floor(mins / 60);
        hours = hours + 8;
        let minutes = mins % 60;

        let str = "";

        if (hours < 10)
            str = str + "0";
        str = str + hours;

        str = str + ":";

        if (minutes == 0)
            str = str + "0";
        str = str + minutes;

        str = str + ":00";

        return str;

    }

    async function getCalendarList(token) {
        let fetch_options = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
            }
        };

        let res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?key=' + apiKey,
            fetch_options);
        let data = await res.json();

        return data.items;

    }

    async function sendToGoogleCalendar(events, lessons, subjectColorsId, token, calId) {
        let index = 0;
        let promises = [];

        for (let event of events) {
            event["colorId"] = subjectColorsId[lessons[index].subject] ?? "7";
            let fetch_options = {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            };

            promises.push(fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
                fetch_options));
            index++;
        }

        return Promise.all(promises);

    }

    /* src\App.svelte generated by Svelte v3.46.4 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i][0];
    	child_ctx[20] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i].subject;
    	child_ctx[24] = list[i].type;
    	child_ctx[25] = list[i].startDate;
    	child_ctx[26] = list[i].endDate;
    	child_ctx[27] = list[i].room;
    	child_ctx[29] = i;
    	return child_ctx;
    }

    // (202:1) {:else}
    function create_else_block(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Success";
    			add_location(h1, file, 203, 3, 4978);
    			attr_dev(div, "class", "container");
    			add_location(div, file, 202, 2, 4951);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(202:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (112:1) {#if !finish}
    function create_if_block(ctx) {
    	let div8;
    	let div2;
    	let div1;
    	let div0;
    	let t1;
    	let div3;
    	let t2;
    	let div5;
    	let div4;
    	let button0;
    	let b0;
    	let t4;
    	let div7;
    	let div6;
    	let h2;
    	let b1;
    	let t6;
    	let t7;
    	let button1;
    	let b2;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*subjects*/ ctx[4];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*calendarList*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "YOUR CLASSES";
    			t1 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div5 = element("div");
    			div4 = element("div");
    			button0 = element("button");
    			b0 = element("b");
    			b0.textContent = "CONTINUE WITH GOOGLE";
    			t4 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h2 = element("h2");
    			b1 = element("b");
    			b1.textContent = "CHOOSE A CALENDAR";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			button1 = element("button");
    			b2 = element("b");
    			b2.textContent = "EXPORT TO GOOGLE CALENDAR";
    			attr_dev(div0, "class", "fs-1 fw-bold");
    			add_location(div0, file, 115, 5, 2839);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file, 114, 4, 2816);
    			attr_dev(div2, "class", "row text-center");
    			add_location(div2, file, 113, 3, 2782);
    			attr_dev(div3, "class", "row row-cols-2 justify-content-md-center gy-3 mt-1");
    			attr_dev(div3, "id", "subjectList");
    			add_location(div3, file, 118, 3, 2908);
    			add_location(b0, file, 166, 7, 4129);
    			attr_dev(button0, "class", "btn btn-primary");
    			attr_dev(button0, "id", "submitBtn");
    			add_location(button0, file, 162, 5, 4027);
    			attr_dev(div4, "class", "col");
    			add_location(div4, file, 161, 4, 4004);
    			attr_dev(div5, "class", "row text-center mt-4 mb-3");
    			add_location(div5, file, 160, 3, 3960);
    			add_location(b1, file, 176, 9, 4363);
    			add_location(h2, file, 176, 5, 4359);
    			add_location(b2, file, 196, 21, 4862);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "btn btn-primary mt-4");
    			attr_dev(button1, "id", "exportBtn");
    			add_location(button1, file, 192, 5, 4746);
    			attr_dev(div6, "class", "col");
    			set_style(div6, "max-width", "fit-content");
    			add_location(div6, file, 175, 4, 4304);
    			attr_dev(div7, "class", "row text-center justify-content-md-center mb-5");
    			attr_dev(div7, "id", "chooseCalendar");
    			div7.hidden = true;
    			add_location(div7, file, 170, 3, 4196);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file, 112, 2, 2755);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div8, t1);
    			append_dev(div8, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(div8, t2);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(button0, b0);
    			append_dev(div8, t4);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h2);
    			append_dev(h2, b1);
    			append_dev(div6, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(div6, t7);
    			append_dev(div6, button1);
    			append_dev(button1, b2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*continueWithGoogle*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*exportSchedule*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*subjects, colorChanged, Object, colors, lessons, events*/ 120) {
    				each_value_1 = /*subjects*/ ctx[4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*calendarList*/ 4) {
    				each_value = /*calendarList*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, t7);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(112:1) {#if !finish}",
    		ctx
    	});

    	return block;
    }

    // (127:7) {#if sub == subject}
    function create_if_block_1(ctx) {
    	let div;
    	let t0_value = /*type*/ ctx[24] + "";
    	let t0;
    	let t1;
    	let t2_value = /*startDate*/ ctx[25] + "";
    	let t2;
    	let t3;
    	let t4_value = /*endDate*/ ctx[26] + "";
    	let t4;
    	let t5;
    	let t6_value = /*events*/ ctx[5][/*i*/ ctx[29]].start.dateTime.split("T")[1].split("+")[0].substring(0, 5) + "";
    	let t6;
    	let t7;
    	let t8_value = /*events*/ ctx[5][/*i*/ ctx[29]].end.dateTime.split("T")[1].split("+")[0].substring(0, 5) + "";
    	let t8;
    	let t9;
    	let t10_value = /*room*/ ctx[27] + "";
    	let t10;
    	let t11;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(",\n\t\t\t\t\t\t\t\t\t");
    			t2 = text(t2_value);
    			t3 = text(" - ");
    			t4 = text(t4_value);
    			t5 = text(", ");
    			t6 = text(t6_value);
    			t7 = text(" - ");
    			t8 = text(t8_value);
    			t9 = text(", ");
    			t10 = text(t10_value);
    			t11 = space();
    			attr_dev(div, "class", "fw-light text-capitalize");
    			add_location(div, file, 127, 8, 3182);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			append_dev(div, t5);
    			append_dev(div, t6);
    			append_dev(div, t7);
    			append_dev(div, t8);
    			append_dev(div, t9);
    			append_dev(div, t10);
    			append_dev(div, t11);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(127:7) {#if sub == subject}",
    		ctx
    	});

    	return block;
    }

    // (126:6) {#each lessons as { subject, type, startDate, endDate, room }
    function create_each_block_3(ctx) {
    	let if_block_anchor;
    	let if_block = /*sub*/ ctx[17] == /*subject*/ ctx[23] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*sub*/ ctx[17] == /*subject*/ ctx[23]) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(126:6) {#each lessons as { subject, type, startDate, endDate, room }",
    		ctx
    	});

    	return block;
    }

    // (154:7) {#each Object.entries(colors) as [name, value]}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*name*/ ctx[0] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*value*/ ctx[20];
    			option.value = option.__value;
    			attr_dev(option, "class", /*name*/ ctx[0]);
    			add_location(option, file, 154, 8, 3847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(154:7) {#each Object.entries(colors) as [name, value]}",
    		ctx
    	});

    	return block;
    }

    // (123:4) {#each subjects as sub}
    function create_each_block_1(ctx) {
    	let div0;
    	let h4;
    	let t0_value = /*sub*/ ctx[17] + "";
    	let t0;
    	let t1;
    	let t2;
    	let div1;
    	let select;
    	let t3;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*lessons*/ ctx[3];
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = Object.entries(colors);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function change_handler() {
    		return /*change_handler*/ ctx[9](/*sub*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			add_location(h4, file, 124, 6, 3059);
    			attr_dev(div0, "class", "col");
    			add_location(div0, file, 123, 5, 3035);
    			attr_dev(select, "id", /*sub*/ ctx[17] + "select");
    			attr_dev(select, "class", "form-select");
    			attr_dev(select, "aria-label", "Select color");
    			add_location(select, file, 145, 6, 3618);
    			attr_dev(div1, "class", "col-auto");
    			add_location(div1, file, 144, 5, 3589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h4);
    			append_dev(h4, t0);
    			append_dev(div0, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			append_dev(div1, t3);

    			if (!mounted) {
    				dispose = listen_dev(select, "change", change_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*lessons, events, subjects*/ 56) {
    				each_value_3 = /*lessons*/ ctx[3];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty & /*Object, colors*/ 0) {
    				each_value_2 = Object.entries(colors);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(123:4) {#each subjects as sub}",
    		ctx
    	});

    	return block;
    }

    // (178:5) {#each calendarList as cal}
    function create_each_block(ctx) {
    	let div;
    	let input;
    	let input_id_value;
    	let input_value_value;
    	let t0;
    	let label;
    	let t1_value = /*cal*/ ctx[14].summary + "";
    	let t1;
    	let label_for_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			input.required = true;
    			attr_dev(input, "class", "form-check-input");
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "name", "calendarRadio");
    			attr_dev(input, "id", input_id_value = /*cal*/ ctx[14].id);
    			input.value = input_value_value = /*cal*/ ctx[14].id;
    			add_location(input, file, 179, 7, 4464);
    			attr_dev(label, "class", "form-check-label");
    			attr_dev(label, "for", label_for_value = /*cal*/ ctx[14].id);
    			add_location(label, file, 187, 7, 4631);
    			attr_dev(div, "class", "form-check");
    			add_location(div, file, 178, 6, 4432);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			append_dev(div, t0);
    			append_dev(div, label);
    			append_dev(label, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*calendarList*/ 4 && input_id_value !== (input_id_value = /*cal*/ ctx[14].id)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*calendarList*/ 4 && input_value_value !== (input_value_value = /*cal*/ ctx[14].id)) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty & /*calendarList*/ 4 && t1_value !== (t1_value = /*cal*/ ctx[14].summary + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*calendarList*/ 4 && label_for_value !== (label_for_value = /*cal*/ ctx[14].id)) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(178:5) {#each calendarList as cal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;

    	function select_block_type(ctx, dirty) {
    		if (!/*finish*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if_block.c();
    			add_location(main, file, 110, 0, 2731);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let finish = false;
    	let url = new URL(window.location.href);
    	let stringParam = url.searchParams.get("lessons");
    	let lessons = JSON.parse(stringParam);

    	// console.log(lessons);
    	var subjects = [];

    	var events = [];
    	var subjectColorsId = {};

    	for (let lesson of lessons) {
    		if (!subjects.includes(lesson.subject)) subjects.push(lesson.subject);
    		let startDate = moment(lesson.startDate, "DD/MM/YYYY").format("YYYY-MM-DD");
    		let endDate = moment(lesson.endDate, "DD/MM/YYYY").format("YYYYMMDD");
    		let startTime = minsToTime(lesson.startTime);
    		let endTime = minsToTime(lesson.endTime);

    		let event = {
    			summary: lesson.subject + " (" + lesson.type + ")",
    			description: "Aula: " + lesson.room,
    			start: {
    				dateTime: startDate + "T" + startTime,
    				timeZone: "Europe/Rome"
    			},
    			end: {
    				dateTime: startDate + "T" + endTime,
    				timeZone: "Europe/Rome"
    			},
    			recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=" + endDate + "T240000Z"]
    		};

    		events.push(event);
    	}

    	console.log(events);

    	function colorChanged(sub) {
    		let select = document.getElementById(sub + "select");
    		subjectColorsId[sub] = select.value;
    		console.log(subjectColorsId);
    	}

    	var calendarList = [];
    	var userToken = "";

    	function continueWithGoogle() {
    		document.getElementById("submitBtn").disabled = true;

    		chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    			console.log(token);

    			if (!token) {
    				// TODO: error
    				document.getElementById("submitBtn").disabled = false;

    				alert("Authentication error: invalid token\nNote that if you are using Edge it might not work");
    				return;
    			}

    			userToken = token;

    			try {
    				let res = await getCalendarList(token);

    				if (!res) {
    					document.getElementById("submitBtn").disabled = false;
    					alert("Error: can't fetch calendar list");
    					return;
    				}

    				$$invalidate(2, calendarList = res);
    				document.getElementById("submitBtn").hidden = true;
    				document.getElementById("chooseCalendar").hidden = false;
    			} catch(error) {
    				alert(error);
    				document.getElementById("submitBtn").disabled = false;
    			}
    		});
    	}

    	async function exportSchedule() {
    		document.getElementById("exportBtn").disabled = true;
    		let calId = document.querySelector('input[name="calendarRadio"]:checked').value;

    		try {
    			await sendToGoogleCalendar(events, lessons, subjectColorsId, userToken, calId ?? "primary");
    			$$invalidate(1, finish = true);
    		} catch(error) {
    			alert(error);
    			document.getElementById("exportBtn").disabled = false;
    		}
    	}

    	const writable_props = ['name'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const change_handler = sub => {
    		colorChanged(sub);
    	};

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		minsToTime,
    		colors,
    		sendToGoogleCalendar,
    		getCalendarList,
    		finish,
    		url,
    		stringParam,
    		lessons,
    		subjects,
    		events,
    		subjectColorsId,
    		colorChanged,
    		calendarList,
    		userToken,
    		continueWithGoogle,
    		exportSchedule
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('finish' in $$props) $$invalidate(1, finish = $$props.finish);
    		if ('url' in $$props) url = $$props.url;
    		if ('stringParam' in $$props) stringParam = $$props.stringParam;
    		if ('lessons' in $$props) $$invalidate(3, lessons = $$props.lessons);
    		if ('subjects' in $$props) $$invalidate(4, subjects = $$props.subjects);
    		if ('events' in $$props) $$invalidate(5, events = $$props.events);
    		if ('subjectColorsId' in $$props) subjectColorsId = $$props.subjectColorsId;
    		if ('calendarList' in $$props) $$invalidate(2, calendarList = $$props.calendarList);
    		if ('userToken' in $$props) userToken = $$props.userToken;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		finish,
    		calendarList,
    		lessons,
    		subjects,
    		events,
    		colorChanged,
    		continueWithGoogle,
    		exportSchedule,
    		change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=convert_page.js.map
