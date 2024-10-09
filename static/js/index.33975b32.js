/*! For license information please see index.33975b32.js.LICENSE.txt */
(()=>{"use strict";var e={41346:function(e,t,n){var r=n("85893"),o=n("67294"),a=n("16396"),i=n.n(a);let s=Symbol("Comlink.proxy"),c=Symbol("Comlink.endpoint"),l=Symbol("Comlink.releaseProxy"),u=Symbol("Comlink.finalizer"),d=Symbol("Comlink.thrown"),p=e=>"object"==typeof e&&null!==e||"function"==typeof e,f=new Map([["proxy",{canHandle:e=>p(e)&&e[s],serialize(e){let{port1:t,port2:n}=new MessageChannel;return y(e,t),[n,[n]]},deserialize:e=>(e.start(),function(e,t){return w(e,[],t)}(e))}],["throw",{canHandle:e=>p(e)&&d in e,serialize({value:e}){let t;return[t=e instanceof Error?{isError:!0,value:{message:e.message,name:e.name,stack:e.stack}}:{isError:!1,value:e},[]]},deserialize(e){if(e.isError)throw Object.assign(Error(e.value.message),e.value);throw e.value}}]]);function y(e,t=globalThis,n=["*"]){t.addEventListener("message",function r(o){let a;if(!o||!o.data)return;if(!function(e,t){for(let n of e)if(t===n||"*"===n||n instanceof RegExp&&n.test(t))return!0;return!1}(n,o.origin)){console.warn(`Invalid origin '${o.origin}' for comlink proxy`);return}let{id:i,type:s,path:c}=Object.assign({path:[]},o.data),l=(o.data.argumentList||[]).map(O);try{let t=c.slice(0,-1).reduce((e,t)=>e[t],e),n=c.reduce((e,t)=>e[t],e);switch(s){case"GET":a=n;break;case"SET":t[c.slice(-1)[0]]=O(o.data.value),a=!0;break;case"APPLY":a=n.apply(t,l);break;case"CONSTRUCT":{let e=new n(...l);a=k(e)}break;case"ENDPOINT":{let{port1:t,port2:n}=new MessageChannel;y(e,n),a=function(e,t){return S.set(e,t),e}(t,[t])}break;case"RELEASE":a=void 0;break;default:return}}catch(e){a={value:e,[d]:0}}Promise.resolve(a).catch(e=>({value:e,[d]:0})).then(n=>{let[o,a]=j(n);t.postMessage(Object.assign(Object.assign({},o),{id:i}),a),"RELEASE"===s&&(t.removeEventListener("message",r),h(t),u in e&&"function"==typeof e[u]&&e[u]())}).catch(e=>{let[n,r]=j({value:TypeError("Unserializable return value"),[d]:0});t.postMessage(Object.assign(Object.assign({},n),{id:i}),r)})}),t.start&&t.start()}function h(e){if("MessagePort"===e.constructor.name)e.close()}function g(e,t){return w(e,[],t)}function m(e){if(e)throw Error("Proxy has been released and is not useable")}function b(e){return z(e,{type:"RELEASE"}).then(()=>{h(e)})}let v=new WeakMap,E="FinalizationRegistry"in globalThis&&new FinalizationRegistry(e=>{let t=(v.get(e)||0)-1;v.set(e,t),0===t&&b(e)});function w(e,t=[],n=function(){}){let r=!1,o=new Proxy(n,{get(n,a){if(m(r),a===l)return()=>{var t;t=o,E&&E.unregister(t),b(e),r=!0};if("then"===a){if(0===t.length)return{then:()=>o};let n=z(e,{type:"GET",path:t.map(e=>e.toString())}).then(O);return n.then.bind(n)}return w(e,[...t,a])},set(n,o,a){m(r);let[i,s]=j(a);return z(e,{type:"SET",path:[...t,o].map(e=>e.toString()),value:i},s).then(O)},apply(n,o,a){m(r);let i=t[t.length-1];if(i===c)return z(e,{type:"ENDPOINT"}).then(O);if("bind"===i)return w(e,t.slice(0,-1));let[s,l]=x(a);return z(e,{type:"APPLY",path:t.map(e=>e.toString()),argumentList:s},l).then(O)},construct(n,o){m(r);let[a,i]=x(o);return z(e,{type:"CONSTRUCT",path:t.map(e=>e.toString()),argumentList:a},i).then(O)}});return!function(e,t){let n=(v.get(t)||0)+1;v.set(t,n),E&&E.register(e,t,e)}(o,e),o}function x(e){var t;let n=e.map(j);return[n.map(e=>e[0]),(t=n.map(e=>e[1]),Array.prototype.concat.apply([],t))]}let S=new WeakMap;function k(e){return Object.assign(e,{[s]:!0})}function j(e){for(let[t,n]of f)if(n.canHandle(e)){let[r,o]=n.serialize(e);return[{type:"HANDLER",name:t,value:r},o]}return[{type:"RAW",value:e},S.get(e)||[]]}function O(e){switch(e.type){case"HANDLER":return f.get(e.name).deserialize(e.value);case"RAW":return e.value}}function z(e,t,n){return new Promise(r=>{let o=function(){return[,,,,].fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}();e.addEventListener("message",function t(n){if(!!n.data&&!!n.data.id&&n.data.id===o)e.removeEventListener("message",t),r(n.data)}),e.start&&e.start(),e.postMessage(Object.assign({id:o},t),n)})}var P=n("74450"),C=n.n(P);let T=o.createContext(void 0),M=o.memo(e=>{let{children:t}=e,[i,s]=(0,o.useState)(),c=(0,a.useClient)();if((0,o.useEffect)(()=>{if(!!c)(async()=>{var e;let t=w(new SharedWorker(new URL(n.p+n.u("168"),n.b),Object.assign({},{name:"dataproxy-worker"},{type:void 0})).port,[],void 0),{uri:r,token:o}=c.getStackClient();await t.setClient({uri:r,token:o.token,instanceOptions:c.instanceOptions,capabilities:c.capabilities}),s(()=>t)})()},[c]),i)return(0,r.jsx)(T.Provider,{value:i,children:t})});M.displayName="SharedWorkerProvider";let R=()=>{let e=(0,o.useContext)(T);if(!e)throw Error("Please embed");return e},L=o.createContext(void 0),N=o.memo(e=>{let{children:t}=e,n=R();if(y({search:async e=>await n.search(e)},function(e,t=globalThis,n="*"){return{postMessage:(t,r)=>e.postMessage(t,n,r),addEventListener:t.addEventListener.bind(t),removeEventListener:t.removeEventListener.bind(t)}}(parent)),n)return(0,r.jsx)(L.Provider,{value:n,children:t})});N.displayName="SharedWorkerProvider";let A=C()("\uD83D\uDDBC️ [DataProxy main]");C().enable();let _=()=>{let e=(0,a.useClient)(),t=R(),[n,i]=(0,o.useState)({});(0,o.useEffect)(()=>{t.onStateUpdate(k(e=>{console.log("RECEIVED UPDATE",e),i(()=>e)}))},[]);let s=async()=>{let e=await t.search("Some Search Query");A.debug("result",e)};return(0,r.jsxs)("div",{className:"content",children:[(0,r.jsx)("h1",{children:"Cozy DataProxy"}),(0,r.jsx)("p",{children:null==e?void 0:e.getStackClient().uri}),(0,r.jsxs)("p",{children:["Status: ",n.status]}),(0,r.jsx)("button",{onClick:s,children:"Send message"})]})},D=()=>(0,r.jsx)(M,{children:(0,r.jsx)(N,{children:(0,r.jsx)(_,{})})});var U=n("88306"),W=n.n(U),G=n("20745"),I=n("71400");let F={files:{doctype:"io.cozy.files"},contacts:{doctype:"io.cozy.contacts"},apps:{doctype:"io.cozy.apps"}},H=n(75611),q=e=>{if(!e.dataset.cozy)throw Error("No data-cozy dataset found");let t=JSON.parse(e.dataset.cozy),n=window.location.protocol,r=`${n}//${t.domain}`;return new(i())({uri:r,token:t.token,appMetadata:{slug:H.name,version:H.version},schema:F,store:!0})},$=W()(()=>{let e=document.querySelector("[role=application]");if(!e)throw Error("Failed to find [role=application] container");let t=(0,G.createRoot)(e),n=q(e);return n.registerPlugin(I.default.plugin,null),{root:t,client:n}});!function(){let{root:e,client:t}=$();e.render((0,r.jsx)(o.StrictMode,{children:(0,r.jsx)(a.CozyProvider,{client:t,children:(0,r.jsx)(D,{})})}))}()},18925:function(){},75611:function(e){e.exports=JSON.parse('{"name":"cozy-data-proxy","slug":"dataproxy","icon":"icon.svg","categories":[],"version":"0.1.0","licence":"AGPL-3.0","editor":"","source":"https://github.com/cozy/cozy-web-data-proxy.git@build","developer":{"name":"cozy","url":""},"routes":{"/":{"folder":"/","index":"index.html","public":false}},"intents":[{"action":"OPEN","type":["io.cozy.dataproxy"],"href":"/"}],"permissions":{"apps":{"description":"Required by the cozy-bar to display the icons of the apps","type":"io.cozy.apps","verbs":["GET"]},"settings":{"description":"Required by the cozy-bar to display Claudy and know which applications are coming soon","type":"io.cozy.settings","verbs":["GET"]},"mocks todos":{"description":"TO REMOVE: only used as demonstration about Cozy App data interactions","type":"io.mocks.todos"},"files":{"type":"io.cozy.files"},"contacts":{"type":"io.cozy.contacts"}}}')}},t={};function n(r){var o=t[r];if(void 0!==o)return o.exports;var a=t[r]={id:r,loaded:!1,exports:{}};return e[r].call(a.exports,a,a.exports,n),a.loaded=!0,a.exports}n.m=e,n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,{a:t}),t},n.d=function(e,t){for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.u=function(e){return"static/js/async/dataproxy-worker.d6802d0b.js"},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.nmd=function(e){return e.paths=[],!e.children&&(e.children=[]),e},(()=>{var e=[];n.O=function(t,r,o,a){if(r){a=a||0;for(var i=e.length;i>0&&e[i-1][2]>a;i--)e[i]=e[i-1];e[i]=[r,o,a];return}for(var s=1/0,i=0;i<e.length;i++){for(var r=e[i][0],o=e[i][1],a=e[i][2],c=!0,l=0;l<r.length;l++)(!1&a||s>=a)&&Object.keys(n.O).every(function(e){return n.O[e](r[l])})?r.splice(l--,1):(c=!1,a<s&&(s=a));if(c){e.splice(i--,1);var u=o();void 0!==u&&(t=u)}}return t}})(),n.p="/",n.rv=function(){return"1.0.8"},(()=>{n.b=document.baseURI||self.location.href;var e={980:0};n.O.j=function(t){return 0===e[t]};var t=function(t,r){var o=r[0],a=r[1],i=r[2],s,c,l=0;if(o.some(function(t){return 0!==e[t]})){for(s in a)n.o(a,s)&&(n.m[s]=a[s]);if(i)var u=i(n)}for(t&&t(r);l<o.length;l++)c=o[l],n.o(e,c)&&e[c]&&e[c][0](),e[c]=0;return n.O(u)},r=self.webpackChunkcozy_web_data_proxy=self.webpackChunkcozy_web_data_proxy||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})(),n.ruid="bundler=rspack@1.0.8";var r=n.O(void 0,["465","361","689"],function(){return n("41346")});r=n.O(r)})();