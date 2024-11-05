/*! For license information please see index.a8a80dc6.js.LICENSE.txt */
(()=>{"use strict";var e={5179:function(e,t,n){let r;var o=n("85893"),i=n("67294"),a=n("16396"),s=n.n(a),c=n("74450"),l=n.n(c);let u=Symbol("Comlink.proxy"),d=Symbol("Comlink.endpoint"),p=Symbol("Comlink.releaseProxy"),f=Symbol("Comlink.finalizer"),h=Symbol("Comlink.thrown"),y=e=>"object"==typeof e&&null!==e||"function"==typeof e,b=new Map([["proxy",{canHandle:e=>y(e)&&e[u],serialize(e){let{port1:t,port2:n}=new MessageChannel;return g(e,t),[n,[n]]},deserialize:e=>(e.start(),function(e,t){return k(e,[],t)}(e))}],["throw",{canHandle:e=>y(e)&&h in e,serialize({value:e}){let t;return[t=e instanceof Error?{isError:!0,value:{message:e.message,name:e.name,stack:e.stack}}:{isError:!1,value:e},[]]},deserialize(e){if(e.isError)throw Object.assign(Error(e.value.message),e.value);throw e.value}}]]);function g(e,t=globalThis,n=["*"]){t.addEventListener("message",function r(o){let i;if(!o||!o.data)return;if(!function(e,t){for(let n of e)if(t===n||"*"===n||n instanceof RegExp&&n.test(t))return!0;return!1}(n,o.origin)){console.warn(`Invalid origin '${o.origin}' for comlink proxy`);return}let{id:a,type:s,path:c}=Object.assign({path:[]},o.data),l=(o.data.argumentList||[]).map(O);try{let t=c.slice(0,-1).reduce((e,t)=>e[t],e),n=c.reduce((e,t)=>e[t],e);switch(s){case"GET":i=n;break;case"SET":t[c.slice(-1)[0]]=O(o.data.value),i=!0;break;case"APPLY":i=n.apply(t,l);break;case"CONSTRUCT":{let e=new n(...l);i=function(e){return Object.assign(e,{[u]:!0})}(e)}break;case"ENDPOINT":{let{port1:t,port2:n}=new MessageChannel;g(e,n),i=function(e,t){return j.set(e,t),e}(t,[t])}break;case"RELEASE":i=void 0;break;default:return}}catch(e){i={value:e,[h]:0}}Promise.resolve(i).catch(e=>({value:e,[h]:0})).then(n=>{let[o,i]=z(n);t.postMessage(Object.assign(Object.assign({},o),{id:a}),i),"RELEASE"===s&&(t.removeEventListener("message",r),v(t),f in e&&"function"==typeof e[f]&&e[f]())}).catch(e=>{let[n,r]=z({value:TypeError("Unserializable return value"),[h]:0});t.postMessage(Object.assign(Object.assign({},n),{id:a}),r)})}),t.start&&t.start()}function v(e){if("MessagePort"===e.constructor.name)e.close()}function m(e,t){return k(e,[],t)}function w(e){if(e)throw Error("Proxy has been released and is not useable")}function E(e){return P(e,{type:"RELEASE"}).then(()=>{v(e)})}let x=new WeakMap,S="FinalizationRegistry"in globalThis&&new FinalizationRegistry(e=>{let t=(x.get(e)||0)-1;x.set(e,t),0===t&&E(e)});function k(e,t=[],n=function(){}){let r=!1,o=new Proxy(n,{get(n,i){if(w(r),i===p)return()=>{var t;t=o,S&&S.unregister(t),E(e),r=!0};if("then"===i){if(0===t.length)return{then:()=>o};let n=P(e,{type:"GET",path:t.map(e=>e.toString())}).then(O);return n.then.bind(n)}return k(e,[...t,i])},set(n,o,i){w(r);let[a,s]=z(i);return P(e,{type:"SET",path:[...t,o].map(e=>e.toString()),value:a},s).then(O)},apply(n,o,i){w(r);let a=t[t.length-1];if(a===d)return P(e,{type:"ENDPOINT"}).then(O);if("bind"===a)return k(e,t.slice(0,-1));let[s,c]=C(i);return P(e,{type:"APPLY",path:t.map(e=>e.toString()),argumentList:s},c).then(O)},construct(n,o){w(r);let[i,a]=C(o);return P(e,{type:"CONSTRUCT",path:t.map(e=>e.toString()),argumentList:i},a).then(O)}});return!function(e,t){let n=(x.get(t)||0)+1;x.set(t,n),S&&S.register(e,t,e)}(o,e),o}function C(e){var t;let n=e.map(z);return[n.map(e=>e[0]),(t=n.map(e=>e[1]),Array.prototype.concat.apply([],t))]}let j=new WeakMap;function z(e){for(let[t,n]of b)if(n.canHandle(e)){let[r,o]=n.serialize(e);return[{type:"HANDLER",name:t,value:r},o]}return[{type:"RAW",value:e},j.get(e)||[]]}function O(e){switch(e.type){case"HANDLER":return b.get(e.name).deserialize(e.value);case"RAW":return e.value}}function P(e,t,n){return new Promise(r=>{let o=function(){return[,,,,].fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}();e.addEventListener("message",function t(n){if(!!n.data&&!!n.data.id&&n.data.id===o)e.removeEventListener("message",t),r(n.data)}),e.start&&e.start(),e.postMessage(Object.assign({id:o},t),n)})}var M=n("27412");let L="deletingLocalData",T=l()("\uD83D\uDC77‍♂️ [Worker utils]"),R=async()=>{for(let e of(await window.indexedDB.databases()))e.name&&(window.indexedDB.deleteDatabase(e.name),T.info("Deleted indexedDB database : ",e.name))},A=async()=>{console.log("check stale data");let e=localStorage.getItem(L);console.log("has stale : ",e),e&&(await R(),localStorage.removeItem(L))},N=l()("\uD83D\uDC77‍♂️ [SharedWorkerProvider]"),_=i.createContext(void 0);"function"==typeof BroadcastChannel&&(r=new BroadcastChannel("DATA_PROXY_BROADCAST_CHANANEL"));let D=new class e{subscribe(e){return this.subscriptions.add(e),e(this.count),()=>this.subscriptions.delete(e)}setCount(e){let t=!(arguments.length>1)||void 0===arguments[1]||arguments[1];this.count=e,this.subscriptions.forEach(t=>{t(e)}),t&&this.bc.postMessage(this.count)}close(){!this.closed&&(this.bc.postMessage("closed"),this.bc.close(),this.closed=!0)}onMessage(e){let{data:t}=e;if(!this.closed)"opened"===t?this.setCount(this.count+1):"closed"===t?this.setCount(this.count-1):"number"==typeof t&&(this.count>t?this.bc.postMessage(this.count):this.count!==t&&this.setCount(t,!1))}constructor(){(0,M._)(this,"bc",void 0),(0,M._)(this,"count",0),(0,M._)(this,"subscriptions",void 0),(0,M._)(this,"closed",!1),this.bc=new BroadcastChannel("tabcount-sync"),this.bc.postMessage("opened"),this.bc.onmessage=e=>this.onMessage(e),this.count=1,this.subscriptions=new Set}};window.addEventListener("unload",()=>D.close());let W=i.memo(e=>{let{children:t}=e,[s,c]=(0,i.useState)(),[l,u]=(0,i.useState)({status:"not initialized",tabCount:0}),[d,p]=(0,i.useState)(0),f=(0,a.useClient)();if((0,i.useEffect)(()=>{if(!!f)(async()=>{var e;await A(),N.debug("Init SharedWorker");let t=k(new SharedWorker(new URL(n.p+n.u("168"),n.b),Object.assign({},{name:"dataproxy-worker"},{type:void 0})).port,[],void 0);N.debug("Provide CozyClient data to SharedWorker");let{uri:r,token:o}=f.getStackClient();t.setup({uri:r,token:o.token,instanceOptions:f.instanceOptions,capabilities:f.capabilities}),c(()=>t)})()},[f]),(0,i.useEffect)(()=>{r.addEventListener("message",e=>{u(e.data)})},[]),(0,i.useEffect)(()=>{D.subscribe(e=>{p(e)})},[]),!s)return;let h={worker:s,workerState:{...l,tabCount:d}};return(0,o.jsx)(_.Provider,{value:h,children:t})});W.displayName="SharedWorkerProvider";let I=()=>{let e=(0,i.useContext)(_);if(!e)throw Error("Please embed");return e},B=i.createContext(void 0),H=i.memo(e=>{let{children:t}=e,n=I();if(g({search:async e=>await n.worker.search(e)},function(e,t=globalThis,n="*"){return{postMessage:(t,r)=>e.postMessage(t,n,r),addEventListener:t.addEventListener.bind(t),removeEventListener:t.removeEventListener.bind(t)}}(parent)),n)return(0,o.jsx)(B.Provider,{value:n,children:t})});H.displayName="SharedWorkerProvider",l().enable();let F=()=>{var e;let t=(0,a.useClient)(),{workerState:n}=I();return(0,o.jsxs)("div",{className:"content",children:[(0,o.jsx)("h1",{children:"Cozy DataProxy"}),(0,o.jsx)("p",{children:null==t?void 0:t.getStackClient().uri}),(0,o.jsxs)("p",{children:["Status: ",n.status]}),(0,o.jsxs)("p",{children:["Count: ",n.tabCount]}),null===(e=n.indexLength)||void 0===e?void 0:e.map(e=>(0,o.jsxs)("p",{children:["- ",e.doctype,": ",e.count," documents"]}))]})},G=()=>(0,o.jsx)(W,{children:(0,o.jsx)(H,{children:(0,o.jsx)(F,{})})});var U=n("88306"),q=n.n(U),Y=n("20745"),$=n("71400");let J={files:{doctype:"io.cozy.files"},contacts:{doctype:"io.cozy.contacts"},apps:{doctype:"io.cozy.apps"}},X=n(75611),K=e=>{if(!e.dataset.cozy)throw Error("No data-cozy dataset found");let t=JSON.parse(e.dataset.cozy),n=window.location.protocol,r=`${n}//${t.domain}`;return new(s())({uri:r,token:t.token,appMetadata:{slug:X.name,version:X.version},schema:J,store:!0})},Q=q()(()=>{let e=document.querySelector("[role=application]");if(!e)throw Error("Failed to find [role=application] container");let t=(0,Y.createRoot)(e),n=K(e);return n.registerPlugin($.default.plugin,null),{root:t,client:n}});!function(){let{root:e,client:t}=Q();e.render((0,o.jsx)(i.StrictMode,{children:(0,o.jsx)(a.CozyProvider,{client:t,children:(0,o.jsx)(G,{})})}))}()},18925:function(){},75611:function(e){e.exports=JSON.parse('{"name":"cozy-data-proxy","slug":"dataproxy","icon":"icon.svg","categories":["cozy"],"version":"0.1.0","licence":"AGPL-3.0","editor":"Cozy","source":"https://github.com/cozy/cozy-web-data-proxy","developer":{"name":"cozy","url":"https://cozy.io"},"routes":{"/":{"folder":"/","index":"index.html","public":false},"/reset":{"folder":"/reset","index":"index.html","public":true}},"intents":[{"action":"OPEN","type":["io.cozy.dataproxy"],"href":"/"}],"permissions":{"apps":{"description":"Required to search in apps","type":"io.cozy.apps","verbs":["GET"]},"files":{"description":"Required to search in files","type":"io.cozy.files"},"contacts":{"description":"Required to search in contacts","type":"io.cozy.contacts"}}}')}},t={};function n(r){var o=t[r];if(void 0!==o)return o.exports;var i=t[r]={id:r,loaded:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.loaded=!0,i.exports}n.m=e,n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,{a:t}),t},n.d=function(e,t){for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.u=function(e){return"static/js/async/dataproxy-worker.d85de707.js"},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.nmd=function(e){return e.paths=[],!e.children&&(e.children=[]),e},(()=>{var e=[];n.O=function(t,r,o,i){if(r){i=i||0;for(var a=e.length;a>0&&e[a-1][2]>i;a--)e[a]=e[a-1];e[a]=[r,o,i];return}for(var s=1/0,a=0;a<e.length;a++){for(var r=e[a][0],o=e[a][1],i=e[a][2],c=!0,l=0;l<r.length;l++)(!1&i||s>=i)&&Object.keys(n.O).every(function(e){return n.O[e](r[l])})?r.splice(l--,1):(c=!1,i<s&&(s=i));if(c){e.splice(a--,1);var u=o();void 0!==u&&(t=u)}}return t}})(),n.p="/",n.rv=function(){return"1.0.8"},n.j="980",(()=>{n.b=document.baseURI||self.location.href;var e={980:0};n.O.j=function(t){return 0===e[t]};var t=function(t,r){var o=r[0],i=r[1],a=r[2],s,c,l=0;if(o.some(function(t){return 0!==e[t]})){for(s in i)n.o(i,s)&&(n.m[s]=i[s]);if(a)var u=a(n)}for(t&&t(r);l<o.length;l++)c=o[l],n.o(e,c)&&e[c]&&e[c][0](),e[c]=0;return n.O(u)},r=self.webpackChunkcozy_web_data_proxy=self.webpackChunkcozy_web_data_proxy||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})(),n.ruid="bundler=rspack@1.0.8";var r=n.O(void 0,["465","361","362"],function(){return n("5179")});r=n.O(r)})();