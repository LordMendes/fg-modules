(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/web/src/lib/categories.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CATEGORIES",
    ()=>CATEGORIES,
    "CATEGORY_KEYS",
    ()=>CATEGORY_KEYS,
    "CATEGORY_ROUTE_MAP",
    ()=>CATEGORY_ROUTE_MAP,
    "getCategoryLabel",
    ()=>getCategoryLabel,
    "isCategoryKey",
    ()=>isCategoryKey
]);
const CATEGORIES = [
    {
        key: "spells",
        label: "Spells",
        icon: "✦"
    },
    {
        key: "feats",
        label: "Feats",
        icon: "⚔"
    },
    {
        key: "monsters",
        label: "Monsters",
        icon: "🐉"
    },
    {
        key: "classes",
        label: "Classes",
        icon: "📜"
    },
    {
        key: "skills",
        label: "Skills",
        icon: "🎯"
    },
    {
        key: "races",
        label: "Races",
        icon: "👤"
    },
    {
        key: "items",
        label: "Magic Items",
        icon: "💎"
    },
    {
        key: "equipment",
        label: "Equipment",
        icon: "🛡"
    },
    {
        key: "domains",
        label: "Domains",
        icon: "☀"
    },
    {
        key: "deities",
        label: "Deities",
        icon: "⚜"
    },
    {
        key: "psionics",
        label: "Psionics",
        icon: "🧠"
    },
    {
        key: "templates",
        label: "Templates",
        icon: "🔮"
    },
    {
        key: "rules",
        label: "Rules",
        icon: "📖"
    }
];
const CATEGORY_KEYS = CATEGORIES.map(_c = (c)=>c.key);
_c1 = CATEGORY_KEYS;
function isCategoryKey(value) {
    return CATEGORY_KEYS.includes(value);
}
function getCategoryLabel(key) {
    return CATEGORIES.find((c)=>c.key === key)?.label ?? key;
}
const CATEGORY_ROUTE_MAP = {
    spells: "spells",
    feats: "feats",
    monsters: "monsters",
    classes: "classes",
    skills: "skills",
    races: "races",
    items: "items",
    equipment: "equipment",
    domains: "domains",
    deities: "deities",
    psionics: "psionics",
    templates: "templates",
    rules: "rules"
};
var _c, _c1;
__turbopack_context__.k.register(_c, "CATEGORY_KEYS$CATEGORIES.map");
__turbopack_context__.k.register(_c1, "CATEGORY_KEYS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/web/src/components/home-search.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HomeSearch",
    ()=>HomeSearch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.10_@babel+core@7._54fe0b4b34f39aa1bf7e10b73832e4f5/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.10_@babel+core@7._54fe0b4b34f39aa1bf7e10b73832e4f5/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.10_@babel+core@7._54fe0b4b34f39aa1bf7e10b73832e4f5/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.10_@babel+core@7._54fe0b4b34f39aa1bf7e10b73832e4f5/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$511$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.511.0_react@19.2.4/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$components$2f$session$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/src/components/session-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$actions$2f$data$3a$51b1df__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/web/src/actions/data:51b1df [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$lib$2f$categories$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/src/lib/categories.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const DEBOUNCE_MS = 250;
function HomeSearch() {
    _s();
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [results, setResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeIndex, setActiveIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [isPending, startTransition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const nonce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$components$2f$session$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSessionNonce"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const listId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomeSearch.useEffect": ()=>{
            const trimmed = query.trim();
            if (trimmed.length < 2) {
                setResults([]);
                setOpen(false);
                setActiveIndex(-1);
                return;
            }
            const timer = window.setTimeout({
                "HomeSearch.useEffect.timer": ()=>{
                    const id = ++requestId.current;
                    startTransition({
                        "HomeSearch.useEffect.timer": async ()=>{
                            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$actions$2f$data$3a$51b1df__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["searchEntities"])({
                                query: trimmed,
                                nonce
                            });
                            if (id !== requestId.current) return;
                            if (!result.success) {
                                setResults([]);
                                setOpen(false);
                                return;
                            }
                            const hits = result.results ?? [];
                            setResults(hits);
                            setOpen(hits.length > 0);
                            setActiveIndex(-1);
                        }
                    }["HomeSearch.useEffect.timer"]);
                }
            }["HomeSearch.useEffect.timer"], DEBOUNCE_MS);
            return ({
                "HomeSearch.useEffect": ()=>window.clearTimeout(timer)
            })["HomeSearch.useEffect"];
        }
    }["HomeSearch.useEffect"], [
        query,
        nonce
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomeSearch.useEffect": ()=>{
            function handlePointerDown(event) {
                if (!rootRef.current?.contains(event.target)) {
                    setOpen(false);
                }
            }
            document.addEventListener("mousedown", handlePointerDown);
            return ({
                "HomeSearch.useEffect": ()=>document.removeEventListener("mousedown", handlePointerDown)
            })["HomeSearch.useEffect"];
        }
    }["HomeSearch.useEffect"], []);
    function goToSearchPage(value) {
        const trimmed = value.trim();
        if (trimmed.length < 2) return;
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    function handleSubmit(e) {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
            const hit = results[activeIndex];
            router.push(`/${hit.category}/${hit.slug}`);
            return;
        }
        goToSearchPage(query);
    }
    function handleKeyDown(e) {
        if (!open || results.length === 0) {
            if (e.key === "Escape") setOpen(false);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev)=>(prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev)=>prev <= 0 ? results.length - 1 : prev - 1);
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `home-search${open ? " is-open" : ""}`,
        ref: rootRef,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleSubmit,
                className: "home-search-form",
                role: "search",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$511$2e$0_react$40$19$2e$2$2e$4$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                        className: "home-search-icon h-5 w-5",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/web/src/components/home-search.tsx",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "search",
                        role: "combobox",
                        value: query,
                        onChange: (e)=>setQuery(e.target.value),
                        onFocus: ()=>{
                            if (results.length > 0) setOpen(true);
                        },
                        onKeyDown: handleKeyDown,
                        placeholder: "Search spells, feats, monsters, classes…",
                        "aria-label": "Search the archives",
                        "aria-autocomplete": "list",
                        "aria-controls": listId,
                        "aria-expanded": open,
                        "aria-activedescendant": activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined,
                        className: "home-search-input",
                        autoComplete: "off"
                    }, void 0, false, {
                        fileName: "[project]/web/src/components/home-search.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        className: "home-search-submit",
                        disabled: isPending,
                        children: isPending ? "Searching…" : "Search"
                    }, void 0, false, {
                        fileName: "[project]/web/src/components/home-search.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/web/src/components/home-search.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, this),
            open && results.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                id: listId,
                className: "home-search-results",
                role: "listbox",
                children: [
                    results.map((hit, index)=>{
                        const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$lib$2f$categories$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isCategoryKey"])(hit.category) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$lib$2f$categories$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCategoryLabel"])(hit.category) : hit.category;
                        const active = index === activeIndex;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            role: "presentation",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                id: `${listId}-option-${index}`,
                                href: `/${hit.category}/${hit.slug}`,
                                className: `home-search-result${active ? " is-active" : ""}`,
                                role: "option",
                                "aria-selected": active,
                                onMouseEnter: ()=>setActiveIndex(index),
                                onClick: ()=>setOpen(false),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "home-search-result-category",
                                        children: label
                                    }, void 0, false, {
                                        fileName: "[project]/web/src/components/home-search.tsx",
                                        lineNumber: 153,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "home-search-result-name",
                                        children: hit.name
                                    }, void 0, false, {
                                        fileName: "[project]/web/src/components/home-search.tsx",
                                        lineNumber: 154,
                                        columnNumber: 19
                                    }, this),
                                    hit.snippet ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "home-search-result-snippet",
                                        children: [
                                            hit.snippet,
                                            "…"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/web/src/components/home-search.tsx",
                                        lineNumber: 156,
                                        columnNumber: 21
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/web/src/components/home-search.tsx",
                                lineNumber: 144,
                                columnNumber: 17
                            }, this)
                        }, `${hit.category}-${hit.slug}`, false, {
                            fileName: "[project]/web/src/components/home-search.tsx",
                            lineNumber: 143,
                            columnNumber: 15
                        }, this);
                    }),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "home-search-footer",
                        role: "presentation",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>goToSearchPage(query),
                            className: "home-search-all",
                            children: [
                                "View all results for “",
                                query.trim(),
                                "”"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/web/src/components/home-search.tsx",
                            lineNumber: 163,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/web/src/components/home-search.tsx",
                        lineNumber: 162,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/web/src/components/home-search.tsx",
                lineNumber: 136,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/web/src/components/home-search.tsx",
        lineNumber: 107,
        columnNumber: 5
    }, this);
}
_s(HomeSearch, "L382zo2wWyKeW1H6ofBOb/Fl6P8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"],
        __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$src$2f$components$2f$session$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSessionNonce"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$10_$40$babel$2b$core$40$7$2e$_54fe0b4b34f39aa1bf7e10b73832e4f5$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = HomeSearch;
var _c;
__turbopack_context__.k.register(_c, "HomeSearch");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=web_src_01yurtc._.js.map