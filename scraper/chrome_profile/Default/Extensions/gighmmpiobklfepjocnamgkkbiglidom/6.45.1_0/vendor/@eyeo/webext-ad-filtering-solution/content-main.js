/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ../../node_modules/uuid/dist/esm-browser/native.js
const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
/* harmony default export */ const esm_browser_native = ({
  randomUUID
});
;// ../../node_modules/uuid/dist/esm-browser/rng.js
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);

    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }

  return getRandomValues(rnds8);
}
;// ../../node_modules/uuid/dist/esm-browser/stringify.js
/* unused harmony import specifier */ var validate;

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!validate(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const esm_browser_stringify = ((/* unused pure expression or super */ null && (stringify)));
;// ../../node_modules/uuid/dist/esm-browser/v4.js




function v4(options, buf, offset) {
  if (esm_browser_native.randomUUID && !buf && !options) {
    return esm_browser_native.randomUUID();
  }

  options = options || {};
  const rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return unsafeStringify(rnds);
}

/* harmony default export */ const esm_browser_v4 = (v4);
;// ../../node_modules/@eyeo/snippets/webext/main.mjs
/*!
 * This file is part of eyeo's Anti-Circumvention Snippets module (@eyeo/snippets),
 * Copyright (C) 2006-present eyeo GmbH
 * 
 * @eyeo/snippets is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 * 
 * @eyeo/snippets is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with @eyeo/snippets.  If not, see <http://www.gnu.org/licenses/>.
 */
let currentEnvironment = {initial: true};
const callback = (environment, ...filters) => {
const e=Proxy,{apply:t,bind:n,call:r}=Function,o=r.bind(t),i=r.bind(n),s=r.bind(r),a={get:(e,t)=>i(r,e[t])},c=t=>new e(t,a),l=(t,n)=>new e(t,{apply:(e,t,r)=>o(n,t,r)}),u={get:(e,t)=>i(e[t],e)},f=t=>new e(t,u),{assign:p,defineProperties:d,freeze:h,getOwnPropertyDescriptor:y,getOwnPropertyDescriptors:g,getPrototypeOf:w}=f(Object),{hasOwnProperty:m}=c({}),{species:v}=Symbol,b={get(e,t){const n=e[t];class r extends n{}const o=g(n.prototype);delete o.constructor,h(d(r.prototype,o));const i=g(n);return delete i.length,delete i.prototype,i[v]={value:r},h(d(r,i))}},E=t=>new e(t,b);"undefined"!=typeof currentEnvironment&&currentEnvironment.initial&&"undefined"!=typeof environment&&(currentEnvironment=environment);const S=()=>"undefined"!=typeof currentEnvironment?currentEnvironment:"undefined"!=typeof environment?environment:{};"undefined"==typeof globalThis&&(window.globalThis=window);const{apply:x,ownKeys:$}=f(Reflect),R=S(),k="world"in R,P=k&&"ISOLATED"===R.world,O=k&&"MAIN"===R.world,T="object"==typeof chrome&&!!chrome.runtime,j="object"==typeof browser&&!!browser.runtime,A=!O&&(P||T||j),L=e=>A?e:C(e,F(e)),{create:C,defineProperties:M,defineProperty:N,freeze:I,getOwnPropertyDescriptor:D,getOwnPropertyDescriptors:F}=f(Object),W=f(globalThis),q=A?globalThis:E(globalThis),{Map:H,RegExp:B,Set:J,WeakMap:_,WeakSet:V}=q,z=(e,t,n=null)=>{const r=$(t);for(const o of $(e)){if(r.includes(o))continue;const i=D(e,o);if(n&&"value"in i){const{value:e}=i;"function"==typeof e&&(i.value=n(e))}N(t,o,i)}},U=e=>{const t=q[e];class n extends t{}const{toString:r,valueOf:o}=t.prototype;M(n.prototype,{toString:{value:r},valueOf:{value:o}});const i=e.toLowerCase(),s=e=>function(){const t=x(e,this,arguments);return typeof t===i?new n(t):t};return z(t,n,s),z(t.prototype,n.prototype,s),n},X=I({frozen:new _,hidden:new V,iframePropertiesToAbort:{read:new J,write:new J},abortedIframes:new _}),G=new B("^[A-Z]"),K=A&&(T&&chrome||j&&browser)||void 0;var Q=new Proxy(new H([["chrome",K],["browser",K],["isExtensionContext",A],["variables",X],["console",L(console)],["document",globalThis.document],["JSON",L(JSON)],["Map",H],["Math",L(Math)],["Number",A?Number:U("Number")],["RegExp",B],["Set",J],["String",A?String:U("String")],["WeakMap",_],["WeakSet",V],["MouseEvent",MouseEvent]]),{get(e,t){if(e.has(t))return e.get(t);let n=globalThis[t];return"function"==typeof n&&(n=(G.test(t)?q:W)[t]),e.set(t,n),n},has:(e,t)=>e.has(t)});const Y={WeakSet:WeakSet,WeakMap:WeakMap,WeakValue:class{has(){return!1}set(){}}},{apply:Z}=Reflect;const{Map:ee,WeakMap:te,WeakSet:ne,setTimeout:re}=Q;let oe=!0,ie=e=>{e.clear(),oe=!oe};var se=function(e){const{WeakSet:t,WeakMap:n,WeakValue:r}=this||Y,o=new t,i=new n,s=new r;return function(t){if(o.has(t))return t;if(i.has(t))return i.get(t);if(s.has(t))return s.get(t);const n=Z(e,this,arguments);return o.add(n),n!==t&&("object"==typeof t&&t?i:s).set(t,n),n}}.bind({WeakMap:te,WeakSet:ne,WeakValue:class extends ee{set(e,t){return oe&&(oe=!oe,re(ie,0,this)),super.set(e,t)}}});const{concat:ae,includes:ce,join:le,reduce:ue,unshift:fe}=c([]),{Map:pe,WeakMap:de}=E(globalThis),he=new pe,ye=e=>{const t=(e=>{const t=[];let n=e;for(;n;){if(he.has(n))fe(t,he.get(n));else{const e=g(n);he.set(n,e),fe(t,e)}n=w(n)}return fe(t,{}),o(p,null,t)})("function"==typeof e?e.prototype:e),n={get(e,n){if(n in t){const{value:r,get:o}=t[n];if(o)return s(o,e);if("function"==typeof r)return i(r,e)}return e[n]},set(e,n,r){if(n in t){const{set:o}=t[n];if(o)return s(o,e,r),!0}return e[n]=r,!0}};return e=>new Proxy(e,n)},{isExtensionContext:ge,Array:we,Number:me,String:ve,Object:be}=Q,{isArray:Ee}=we,{getOwnPropertyDescriptor:Se,setPrototypeOf:xe}=be,{toString:$e}=be.prototype,{slice:Re}=ve.prototype,{get:ke}=Se(Node.prototype,"nodeType"),Pe=ge?{}:{Attr:ye(Attr),CanvasRenderingContext2D:ye(CanvasRenderingContext2D),CSSStyleDeclaration:ye(CSSStyleDeclaration),Document:ye(Document),Element:ye(Element),HTMLCanvasElement:ye(HTMLCanvasElement),HTMLElement:ye(HTMLElement),HTMLImageElement:ye(HTMLImageElement),HTMLScriptElement:ye(HTMLScriptElement),MutationRecord:ye(MutationRecord),Node:ye(Node),ShadowRoot:ye(ShadowRoot),get CSS2Properties(){return Pe.CSSStyleDeclaration}},Oe=(e,t)=>{if("Element"!==t&&t in Pe)return Pe[t](e);if(Ee(e))return xe(e,we.prototype);const n=(e=>s(Re,s($e,e),8,-1))(e);if(n in Pe)return Pe[n](e);if(n in Q)return xe(e,Q[n].prototype);if("nodeType"in e)switch(s(ke,e)){case 1:if(!(t in Pe))throw new Error("unknown hint "+t);return Pe[t](e);case 2:return Pe.Attr(e);case 3:return Pe.Node(e);case 9:return Pe.Document(e)}throw new Error("unknown brand "+n)};var Te=ge?e=>e===window||e===globalThis?Q:e:se(((e,t="Element")=>{if(e===window||e===globalThis)return Q;switch(typeof e){case"object":return e&&Oe(e,t);case"string":return new ve(e);case"number":return new me(e);default:throw new Error("unsupported value")}}));const je={get(e,t){const n=e;for(;!m(e,t);)e=w(e);const{get:r,set:i}=y(e,t);return function(){return arguments.length?o(i,n,arguments):s(r,n)}}},Ae=t=>new e(t,je);let{Math:Le,setInterval:Ce,performance:Me}=Te(window);const Ne={mark(){},end(){},toString:()=>"{mark(){},end(){}}"};let Ie=!0;function De(e,t=10){if(Ie)return Ne;function n(){let e=Te([]);for(let{name:t,duration:n}of Me.getEntriesByType("measure"))e.push({name:t,duration:n});e.length&&Me.clearMeasures()}return De[e]||(De[e]=Ce(n,Le.round(6e4/Le.min(60,t)))),{mark(){Me.mark(e)},end(t=!1){Me.measure(e,e);const r=Me.getEntriesByName(e,"measure"),o=r.length>0?r[r.length-1]:null;console.log("PROFILER:",o),Me.clearMarks(e),t&&(clearInterval(De[e]),delete De[e],n())}}}let{Array:Fe,document:We,Math:qe,RegExp:He}=Te(window);function Be(e){let{length:t}=e;if(t>1&&"/"===e[0]){let n="/"===e[t-1];if(n||t>2&&Te(e).endsWith("/i")){let t=[Te(e).slice(1,n?-1:-2)];return n||t.push("i"),new He(...t)}}return new He(Te(e).replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"))}function Je(e){const t=S();if("function"==typeof t.sendSnippetHitEvent)try{t.sendSnippetHitEvent(e,We.location.hostname)}catch(e){}}function _e(){return Te(qe.floor(2116316160*qe.random()+60466176)).toString(36)}function Ve(e){return Te(Fe.from(e)).map((e=>`'${e}'`)).join(" ")}let ze=!1,Ue=null;function Xe(){return ze}const{console:Ge}=Te(window),Ke=()=>{};function Qe(...e){let{mark:t,end:n}=De("log");if(Xe()){const t=["%c DEBUG","font-weight: bold;"],n=e.indexOf("error"),r=e.indexOf("warn"),o=e.indexOf("success"),i=e.indexOf("info");-1!==n?(t[0]+=" - ERROR",t[1]+="color: red; border:2px solid red",Te(e).splice(n,1)):-1!==r?(t[0]+=" - WARNING",t[1]+="color: orange; border:2px solid orange ",Te(e).splice(r,1)):-1!==o?(t[0]+=" - SUCCESS",t[1]+="color: green; border:2px solid green",Te(e).splice(o,1)):-1!==i&&(t[1]+="color: black;",Te(e).splice(i,1)),Te(e).unshift(...t);const s=Ue;if(s){if(!Te(e).some((e=>Te(s).test(e))))return}}t(),Ge.log(...e),n()}function Ye(e){return i(Xe()?Qe:Ke,null,e)}const{Function:Ze,Object:et,WeakMap:tt}=Te(window);let nt=!1;const rt=new tt;function ot(e,t){nt||function(){const{toString:e}=Ze.prototype,t=l(e,(function(){const t=rt.get(this);return o(e,void 0!==t?t:this,arguments)}));et.defineProperty(window.Function.prototype,"toString",{value:t}),rt.set(t,e),nt=!0}(),rt.set(e,t)}let{parseFloat:it,variables:st,clearTimeout:at,fetch:ct,setTimeout:lt,Array:ut,Error:ft,Map:pt,Object:dt,ReferenceError:ht,Set:yt,WeakMap:gt}=Te(window),{onerror:wt}=Ae(window),mt=Node.prototype,vt=Element.prototype,bt=null;function Et(e,t,n,r=!0){let o=Te(t),i=o.indexOf(".");if(-1==i){let o=dt.getOwnPropertyDescriptor(e,t);if(o&&!o.configurable)return;let i=dt.assign({},n,{configurable:r});if(!o&&!i.get&&i.set){let n=e[t];i.get=()=>n}return void dt.defineProperty(e,t,i)}let s=o.slice(0,i).toString();t=o.slice(i+1).toString();let a=e[s];!a||"object"!=typeof a&&"function"!=typeof a||Et(a,t,n);let c=dt.getOwnPropertyDescriptor(e,s);if(c&&!c.configurable)return;bt||(bt=new gt),bt.has(e)||bt.set(e,new pt);let l=bt.get(e);if(l.has(s))return void l.get(s).set(t,n);let u=new pt([[t,n]]);l.set(s,u),dt.defineProperty(e,s,{get:()=>a,set(e){if(a=e,a&&("object"==typeof a||"function"==typeof a))for(let[e,t]of u)Et(a,e,t)},configurable:r})}function St(e){let t=wt();wt(((...n)=>{let r=n.length&&n[0];return!("string"!=typeof r||!Te(r).includes(e))||("function"==typeof t?o(t,this,n):void 0)}))}function xt(e,t,n,r="",o=!0){let i=Ye(e);if(!n)return void i("error","no property to abort on read");let s=_e(),a=!1;i("info",`aborting on ${n} access`),Et(t,n,{get:function(){throw i("success",`${n} access aborted`,`\nFILTER: ${e} ${r}`),a||(a=!0,Je(`${e} ${r}`)),new ht(s)},set(){}},o),St(s)}function $t(e,t,n,r="",o=!0){let i=Ye(e);if(!n)return void i("error","no property to abort on write");let s=_e(),a=!1;i("info",`aborting when setting ${n}`),Et(t,n,{set:function(){throw i("success",`setting ${n} aborted`,`\nFILTER: ${e} ${r}`),a||(a=!0,Je(`${e} ${r}`)),new ht(s)}},o),St(s)}function Rt(e,t=!1,n=!1){let r=st.abortedIframes,i=st.iframePropertiesToAbort;const a=Ve(e);for(let o of ut.from(window.frames))if(r.has(o))for(let i of e)t&&r.get(o).read.add({property:i,formattedProperties:a}),n&&r.get(o).write.add({property:i,formattedProperties:a});for(let r of e)t&&i.read.add({property:r,formattedProperties:a}),n&&i.write.add({property:r,formattedProperties:a});function c(){for(let e of ut.from(window.frames)){r.has(e)||r.set(e,{read:new yt(i.read),write:new yt(i.write)});let t=r.get(e).read;if(t.size>0){let n=ut.from(t);t.clear();for(let{property:t,formattedProperties:r}of n)xt("abort-on-iframe-property-read",e,t,r)}let n=r.get(e).write;if(n.size>0){let t=ut.from(n);n.clear();for(let{property:n,formattedProperties:r}of t)$t("abort-on-iframe-property-write",e,n,r)}}}c(),r.has(document)||(r.set(document,!0),function(e){let t;function n(e,t){for(let n of t){Et(e,n,r(e,n))}}function r(t,n){let r=t[n],i=function(...t){let n;return n=o(r,this,t),e&&e(),n};return ot(i,r),{get:()=>i}}function i(t,n){let r=dt.getOwnPropertyDescriptor(t,n),{set:o}=r||{};return{set(t){let n;return n=s(o,this,t),e&&e(),n}}}n(mt,["appendChild","insertBefore","replaceChild"]),n(vt,["append","prepend","replaceWith","after","before","insertAdjacentElement","insertAdjacentHTML"]),t=i(vt,"innerHTML"),Et(vt,"innerHTML",t),t=i(vt,"outerHTML"),Et(vt,"outerHTML",t)}(c))}let{Object:kt}=window;function Pt(e,t){if(!(e instanceof kt))return;let n=e,r=Te(t).split(".");if(0===r.length)return;for(let e=0;e<r.length-1;e++){let t=r[e];if(!m(n,t))return;if(n=n[t],!(n instanceof kt))return}let o=r[r.length-1];return m(n,o)?[n,o]:void 0}const Ot=Te(/^\d+$/);function Tt(e){switch(e){case"false":return!1;case"true":return!0;case"falseStr":return"false";case"trueStr":return"true";case"null":return null;case"noopFunc":return()=>{};case"trueFunc":return()=>!0;case"falseFunc":return()=>!1;case"emptyArray":return[];case"emptyObj":return{};case"undefined":return;case"":return e;default:return Ot.test(e)?it(e):e}}function jt(e,t){if(!e||!e.length)return!0;const n=_e(),r=new ft(n),o=new URL(self.location.href);o.hash="";const i=/(.*?@)?(\S+)(:\d+):\d+\)?$/,s=[];for(let e of r.stack.split(/[\n\r]+/)){if(Te(e).includes(n))continue;e=Te(e).trim();const t=Te(i).exec(e);if(null===t)continue;let r=t[2];Te(r).startsWith("(")&&(r=Te(r).slice(1)),r===o.href?r="inlineScript":Te(r).startsWith("<anonymous>")&&(r="injectedScript");let a=t[1]?Te(t[1]).slice(0,-1):Te(e).slice(0,Te(t).index).trim();Te(a).startsWith("at")&&(a=Te(a).slice(2).trim());let c=t[3];Te(s).push(" "+`${a} ${r}${c}:1`.trim())}s[0]="stackDepth:"+(s.length-1);const a=Te(s).join("\n");for(let n of e){if(Be(n).test(a))return t("info",`Found needle in stack trace: ${n}`),!0}return t("info",`Stack trace does not match any needle. Stack trace: ${a}`),!1}new pt;let{HTMLScriptElement:At,Object:Lt,ReferenceError:Ct}=Te(window),Mt=Lt.getPrototypeOf(At);const{Error:Nt,Object:It,Array:Dt,Map:Ft}=Te(window);let Wt=null;const qt=new Set;function Ht(e){qt.has(e)||(qt.add(e),Je(e))}function Bt(e,t,n){let r=e;for(const e of n){if(!r||!m(r,e))return!1;r=r[e]}if("string"==typeof r||"number"==typeof r){const e=r.toString();return t.test(e)}return!1}const{Array:Jt,Blob:_t,Error:Vt,Object:zt,Reflect:Ut}=Te(window),Xt=[],Gt=new Set;let{Error:Kt,URL:Qt}=Te(window),{cookie:Yt}=Ae(document);const{Map:Zt,Object:en,Reflect:tn,WeakMap:nn}=Te(window),rn=window.EventTarget.prototype.addEventListener,on=window.EventTarget.prototype.removeEventListener,sn=new nn;let an=[];const cn=new Set;function ln(e){cn.has(e)||(cn.add(e),Je(e))}let{console:un,document:fn,getComputedStyle:pn,isExtensionContext:dn,variables:hn,Array:yn,MutationObserver:gn,Object:wn,DOMMatrix:mn,XPathEvaluator:vn,XPathExpression:bn,XPathResult:En}=Te(window);const{querySelectorAll:Sn}=fn,xn=Sn&&i(Sn,fn);function $n(e,t=!1){return Pn(e,xn.bind(fn),fn,t)}function Rn(e,t,n,r){const o=t.getAttribute("xlink:href")||t.getAttribute("href");if(o){const s=xn(o)[0];if(!s&&Xe())return un.log("No elements found matching",o),!1;if(!(i=e)||0===i.length||i.every((e=>""===e.trim()))){const e=r.length>0?r:[];return n.push({element:s,rootParents:[...e,t]}),!1}const a=s.querySelectorAll.bind(s);return{nextBoundElement:s,nestedSelectorsString:e.join("^^"),next$$:a}}var i}function kn(e,t){const n=function(e,t=!1){try{const n=navigator.userAgent.includes("Firefox")?e.openOrClosedShadowRoot:browser.dom.openOrClosedShadowRoot(e);return null===n&&Xe()&&!t&&un.log("Shadow root not found or not added in element yet",e),n}catch(n){return Xe()&&!t&&un.log("Error while accessing shadow root",e,n),null}}(t);if(n){const{querySelectorAll:r}=n,o=r&&i(r,n).bind(n);return{nextBoundElement:t,nestedSelectorsString:":host "+e.join("^^"),next$$:o}}return!1}function Pn(e,t,n,r,o=[]){if(e.includes("^^")){const[i,s,...a]=e.split("^^");let c,l;switch(s){case"svg":l=Rn;break;case"sh":l=kn;break;default:return Xe()&&un.log(s," is not supported. Supported commands are: \n^^sh^^\n^^svg^^"),[]}c=""===i.trim()?[n]:t(i);const u=[];for(const e of c){const t=l(a,e,u,o);if(!t)continue;const{next$$:n,nestedSelectorsString:i,nextBoundElement:s}=t,c=Pn(i,n,s,r,[...o,e]);c&&u.push(...c)}return u}const i=t(e);return r?[...i].map((e=>({element:e,rootParents:o.length>0?o:[]}))):i}const{assign:On,setPrototypeOf:Tn}=wn;class jn extends bn{evaluate(...e){return Tn(o(super.evaluate,this,e),En.prototype)}}class An extends vn{createExpression(...e){return Tn(o(super.createExpression,this,e),jn.prototype)}}function Ln(e){if(hn.hidden.has(e))return!1;!function(e){dn&&"function"==typeof checkElement&&checkElement(e)}(e),hn.hidden.add(e);let{style:t}=Te(e),n=Te(t,"CSSStyleDeclaration"),r=Te([]);const o=S();let{debugCSSProperties:i}=o;for(let[e,t]of i||[["display","none"]])n.setProperty(e,t,"important"),r.push([e,n.getPropertyValue(e)]);return new gn((()=>{for(let[e,t]of r){let r=n.getPropertyValue(e),o=n.getPropertyPriority(e);r==t&&"important"==o||n.setProperty(e,t,"important")}})).observe(e,{attributes:!0,attributeFilter:["style"]}),!0}function Cn(e){let t=e;if(t.startsWith("xpath(")&&t.endsWith(")")){let t=function(e){let t=e;if(t.startsWith("xpath(")&&t.endsWith(")")){let e=t.slice(6,-1),n=(new An).createExpression(e,null),r=En.ORDERED_NODE_SNAPSHOT_TYPE;return e=>{if(!e)return;let t=n.evaluate(fn,r,null),{snapshotLength:o}=t;for(let n=0;n<o;n++)e(t.snapshotItem(n))}}return t=>$n(e).forEach(t)}(e);return()=>{let e=Te([]);return t((t=>e.push(t))),e}}return()=>yn.from($n(e))}let{ELEMENT_NODE:Mn,TEXT_NODE:Nn,prototype:In}=Node,{prototype:Dn}=Element,{prototype:Fn}=HTMLElement,{console:Wn,variables:qn,DOMParser:Hn,Error:Bn,MutationObserver:Jn,Object:_n,ReferenceError:Vn}=Te(window),{getOwnPropertyDescriptor:zn}=_n;const{CanvasRenderingContext2D:Un,document:Xn,Map:Gn,MutationObserver:Kn,Object:Qn,requestAnimationFrame:Yn,Set:Zn,WeakMap:er,WeakSet:tr}=Te(window);let nr,rr=new er,or=new tr,ir=new Zn,sr=new tr;const ar=new Zn;let cr=!1,lr=!1,ur=!1,fr=new Zn;function pr(e,t){or.add(e),rr.delete(e);const n=Te(e).closest(t.selector);if(n&&!sr.has(n)){Ln(n),sr.add(n),Ye("hide-if-canvas-contains")("success","Matched: ",n,`\nFILTER: hide-if-canvas-contains ${t.formattedArguments}`);const e="hide-if-canvas-contains "+t.formattedArguments;ar.has(e)||(ar.add(e),Je(e))}else!function(e,t){ir.add({canvasElement:e,rule:t})}(e,t)}function dr(e){cr&&e&&!or.has(e)&&(fr.add(e),ur||(ur=!0,Yn(hr)))}function hr(){ur=!1;const e=fr;fr=new Zn;const t=Ye("hide-if-canvas-contains");for(const n of e){if(or.has(n))continue;let e=null,r=!1;for(const[o,i]of nr)if("data"===i.mode&&Te(n).closest(i.selector)&&!r){if(null===e)try{e=Te(n).toDataURL().toString()}catch(e){t("info","Could not read canvas data URL:",e.message),r=!0;continue}o.test(e)&&pr(n,i)}}}Te(window);const{Map:yr,MutationObserver:gr,Object:wr,Set:mr,WeakSet:vr}=Te(window);let br=Element.prototype,{attachShadow:Er}=br,Sr=new vr,xr=new yr;const $r=new mr;let Rr=null;const{Error:kr,Object:Pr,Array:Or,parseFloat:Tr,isNaN:jr}=Te(window);class Ar{constructor(e){if("string"!=typeof e)throw new kr("JSONPath: query must be a string");if(!e.length)throw new kr("JSONPath: query must be a non-empty string");this._steps=this._tokenize(e)}_tokenize(e){e=Te(e);const t=new Or;let n=0;for("$"===e[0].toString()&&(n=1);n<e.length;){let r=!1;if(e.startsWith("..",n)?(r=!0,n+=2):"."===e[n].toString()&&n++,"["===e[n].toString()){const o=e.indexOf("]",n);if(-1===o)throw new kr(`JSONPath: unclosed bracket in query "${e}"`);const i=e.slice(n+1,o);if(!i.length)throw new kr(`JSONPath: empty bracket notation in query "${e}"`);i.startsWith("?(")?t.push({type:"filter",key:"?",filter:this._parseFilter(i),recursive:r}):t.push({type:"direct",key:i.replace(/['"]/g,"").toString(),recursive:r}),n=o+1}else{const o=e.slice(n).search(/[.[]/),i=-1===o?e.slice(n).toString():e.slice(n,n+o).toString();if(!i&&!r)throw new kr(`JSONPath: trailing dot with no property name in query "${e}"`);(i||r)&&t.push({type:"direct",key:i||"*",recursive:r}),n+=i.length}}return t}_parseFilter(e){const t=(e=Te(e)).match(/(?:[@.]?)([\w]+(?:\.[\w]+)*)\s*([!=^$*]=|[<>]=?)\s*(?:['"](.+?)['"]|([\w.+-]+))\)/);if(!t)throw new kr(`JSONPath: invalid filter expression "${e}"`);return{property:t[1],operator:t[2],target:null!=t[3]?t[3]:t[4]}}evaluate(e){if(!e||"object"!=typeof e)throw new kr("JSONPath: evaluate() requires an object or array");let t=Te([{parent:{root:e},key:"root"}]);for(const e of this._steps){const n=[];for(const{parent:r,key:o}of t){const t=r[o];t&&"object"==typeof t&&(e.recursive?this._deepSearch(t,e,n):this._match(t,e,n))}t=n}return t}_match(e,t,n){const r="*"===t.key||"?"===t.key?Pr.keys(e):[t.key];for(const o of r)if(m(e,o)){if("?"===t.key&&!this._test(e[o],t.filter))continue;n.push({parent:e,key:o})}}_deepSearch(e,t,n,r=1e4){if(this._match(e,t,n),!(r<=0))for(const o of Pr.keys(e))e[o]&&"object"==typeof e[o]&&this._deepSearch(e[o],t,n,r-1)}_test(e,t){if(!t||!e)return!1;let n=e;for(const e of Te(t.property).split(".")){if(null==n||"object"!=typeof n)return!1;n=n[e]}const r=Te(n),o=Te(t.target),i=r.toString(),s=o.toString(),a=Tr(r),c=Tr(o),l=!jr(a)&&!jr(c);switch(t.operator){case"==":return l?a===c:i===s;case"!=":return l?a!==c:i!==s;case"<":return l?a<c:i<s;case"<=":return l?a<=c:i<=s;case">":return l?a>c:i>s;case">=":return l?a>=c:i>=s;case"^=":return r.startsWith(o);case"$=":return r.endsWith(o);case"*=":return r.includes(o);default:return!1}}}const{Array:Lr,Error:Cr,JSON:Mr,Map:Nr,Object:Ir,Response:Dr}=Te(window);let Fr=null;const Wr=new Set;function qr(e){Wr.has(e)||(Wr.add(e),Je(e))}let{Array:Hr,Error:Br,JSON:Jr,Map:_r,Object:Vr,Response:zr}=Te(window),Ur=null;const Xr=new Set;function Gr(e){Xr.has(e)||(Xr.add(e),Je(e))}const{Error:Kr,Object:Qr,Map:Yr}=Te(window);let Zr=null;const eo=new Set;function to(e){eo.has(e)||(eo.add(e),Je(e))}function no(e,t,n){if(!n.length){if("string"==typeof e||"number"==typeof e){const n=e.toString();return t.test(n)}return!1}let r=e;for(const e of n){if(!r||!m(r,e))return!1;r=r[e]}if("string"==typeof r||"number"==typeof r){const e=r.toString();return t.test(e)}return!1}let{Error:ro}=Te(window);const{Array:oo,addEventListener:io,Error:so,Object:ao,Reflect:co,Set:lo,WeakSet:uo}=Te(window),fo=new uo,po=new oo,ho=new lo,yo=new lo;let{Error:go,Map:wo,Object:mo,console:vo}=Te(window),{toString:bo}=Function.prototype,Eo=EventTarget.prototype,{addEventListener:So}=Eo,xo=null;const $o=new Set;const Ro=Proxy,{toStringTag:ko}=Symbol,{defineProperty:Po,deleteProperty:Oo,get:To,getOwnPropertyDescriptor:jo,has:Ao,set:Lo}=f(Reflect),{Array:Co,Error:Mo,Map:No,Object:Io,Set:Do,document:Fo,parseFloat:Wo,setTimeout:qo}=Te(window),Ho=new Co,Bo=new Do;function Jo(e){Bo.has(e)||(Bo.add(e),Je(e))}const _o=new Do(["closed","close","opener","frameElement","parent","top","self","window","globalThis","frames","location","document","history",ko]);let{Array:Vo,Map:zo,Object:Uo,parseInt:Xo,RegExp:Go,Set:Ko}=Te(window);const Qo=new zo,Yo=new Ko,Zo=new Ko;function ei(e){const t=Be(e);return new Go(t.source,t.flags+"g")}let{fetch:ti}=Te(window),ni=!1;const ri=[],oi=[],ii=()=>{if(!ni){let e=l(ti,((...e)=>{let[t]=e,n="string"==typeof t?t:t&&"string"==typeof t.url?t.url:"";if(ri.length>0&&"string"==typeof t){let r;try{r=new URL(t)}catch(e){if(!(e instanceof TypeError))throw e;r=new URL(t,Te(document).location)}ri.forEach((e=>e(r))),e[0]=r.href,n=r.href}return o(ti,self,e).then((e=>{let t=e;return oi.forEach((e=>{t=e(t,{url:n})})),t}))}));ot(e,window.fetch),window.fetch=e,ni=!0}},si=e=>{oi.push(e),ii()};let ai,{Map:ci,Object:li,RegExp:ui,Response:fi}=Te(window);const pi=new Set;const{Error:di,Object:hi,atob:yi,btoa:gi,RegExp:wi}=Te(window);let{XMLHttpRequest:mi,WeakMap:vi,Object:bi}=Te(window),Ei=!1;const Si=[],xi=[],$i=new vi,Ri=()=>{if(Ei)return;const e=class extends mi{open(e,t,...n){return $i.set(this,{method:e,url:t}),super.open(e,t,...n)}send(e){let t=e;if("string"==typeof e&&Si.length>0)for(const e of Si)t=e(t);return super.send(t)}get response(){const e=super.response;if(0===xi.length)return e;const t=$i.get(this);if(void 0===t)return e;const n="string"==typeof e?e.length:void 0;if(t.lastResponseLength!==n&&(t.cachedResponse=void 0,t.lastResponseLength=n),void 0!==t.cachedResponse)return t.cachedResponse;if("string"!=typeof e)return t.cachedResponse=e;let r=e;for(const e of xi)r=e(r,{url:t.url});return t.cachedResponse=r}get responseText(){const e=this.response;return"string"!=typeof e?super.responseText:e}};ot(e,window.XMLHttpRequest),ot(e.prototype.open,window.XMLHttpRequest.prototype.open),ot(e.prototype.send,window.XMLHttpRequest.prototype.send),ot(bi.getOwnPropertyDescriptor(e.prototype,"response").get,bi.getOwnPropertyDescriptor(window.XMLHttpRequest.prototype,"response").get),ot(bi.getOwnPropertyDescriptor(e.prototype,"responseText").get,bi.getOwnPropertyDescriptor(window.XMLHttpRequest.prototype,"responseText").get),window.XMLHttpRequest=e,Ei=!0},ki=e=>{xi.push(e),Ri()};let Pi,{Array:Oi,Error:Ti,JSON:ji,Object:Ai,RegExp:Li}=Te(window);const Ci=new Set;let Mi,{JSON:Ni,RegExp:Ii}=Te(window);const Di=new Set;let Fi,{delete:Wi,has:qi}=c(URLSearchParams.prototype);const Hi=new Set;const{Error:Bi,Object:Ji,parseInt:_i,isNaN:Vi}=Te(window),{toString:zi}=Function.prototype,Ui=window.setTimeout,Xi=window.setInterval,Gi={TIMEOUT:"timeout",INTERVAL:"interval",BOTH:"both"};let Ki=null;const Qi=new Set;const{Array:Yi,Date:Zi,Object:es,Set:ts,WeakSet:ns,document:rs,parseInt:os,window:is}=Te(window);let ss=!1;const as="param_first",cs="param_second",ls="pyv",us="client_screen",fs="ad_type",ps="none",ds="eAFgAQ",hs="8AUB",ys="CHANNEL",gs=["playerErrorMessageRenderer","UNPLAYABLE"];function ws(e){if(!e||"object"!=typeof e)return!1;let t=!1;e.adSlots&&(delete e.adSlots,t=!0),e.playerAds&&(delete e.playerAds,t=!0);const n=e.playerConfig&&e.playerConfig.audioConfig;n&&n.muteOnStart&&(delete n.muteOnStart,t=!0);const r=e.messages;return r&&r[0]&&r[0].youThereRenderer&&(delete r[0].youThereRenderer,t=!0),t}function ms(e,t){if(!e||"object"!=typeof e)return!1;if(null===t||!(t>0))return!1;e.playerConfig||(e.playerConfig={}),e.playerConfig.playbackStartConfig||(e.playerConfig.playbackStartConfig={});const n=e.playerConfig.playbackStartConfig;return n.startSeconds!==t&&(n.startSeconds=t,!0)}function vs(e){if("string"!=typeof e||0===e.length)return null;const t=/[?&]t=([^&#]+)/.exec(e);if(!t)return null;let n=t[1];try{n=decodeURIComponent(n)}catch(e){}if(/^\d+$/.test(n))return os(n,10);const r=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(n);if(!r||!r[1]&&!r[2]&&!r[3])return null;return 3600*os(r[1]||"0",10)+60*os(r[2]||"0",10)+os(r[3]||"0",10)}const{Date:bs,MutationObserver:Es,Set:Ss,document:xs,parseInt:$s,setTimeout:Rs,window:ks}=Te(window);let Ps=!1;function Os(e,t){if(null==e)return;const n=e[t];if("function"==typeof n)try{return n.call(e)}catch(e){return}}function Ts(e,t){const n=function(e){if("string"!=typeof e||0===e.length)return"";let t=e;const n=t.indexOf("?");-1!==n&&(t=t.slice(0,n));const r=t.indexOf("#");-1!==r&&(t=t.slice(0,r));const o=t.indexOf("://");-1!==o&&(t=t.slice(o+3));const i=t.indexOf("/");if(-1===i)return"";const s=t.slice(i),a=/^\/([^/]+)/.exec(s);return a?a[1].toLowerCase():""}(e);for(let e=0;e<t.deny.length;e++)if(t.deny[e]===n)return!1;if(0===t.allow.length)return!0;for(let e=0;e<t.allow.length;e++)if(t.allow[e]===n)return!0;return!1}const js={"abort-current-inline-script":function(e,t=null){const n=Ve(arguments),r=Ye("abort-current-inline-script"),{mark:o,end:i}=De("abort-current-inline-script"),a=t?Be(t):null,c=_e(),l=Te(document).currentScript;let u=!1,f=window;const p=Te(e).split("."),d=Te(p).pop();for(let e of Te(p))if(f=f[e],!f||"object"!=typeof f&&"function"!=typeof f)return void r("warn",p," is not found");const{get:h,set:y}=Lt.getOwnPropertyDescriptor(f,d)||{};let g=f[d];void 0===g&&r("warn","The property",d,"doesn't exist yet. Check typos.");const w=()=>{const e=Te(document).currentScript;if(e instanceof Mt&&""==Te(e,"HTMLScriptElement").src&&e!=l&&(!a||a.test(Te(e).textContent)))throw r("success",p," is aborted \n",e,"\nFILTER: abort-current-inline-script",n),u||(u=!0,Je("abort-current-inline-script "+n)),new Ct(c)},m={get(){return w(),h?s(h,this):g},set(e){w(),y?s(y,this,e):g=e}};o(),Et(f,d,m),i(),St(c)},"abort-on-iframe-property-read":function(...e){const{mark:t,end:n}=De("abort-on-iframe-property-read");t(),Rt(e,!0,!1),n()},"abort-on-iframe-property-write":function(...e){const{mark:t,end:n}=De("abort-on-iframe-property-write");t(),Rt(e,!1,!0),n()},"abort-on-property-read":function(e,t){const n=!("false"===t),r=Ve(arguments),{mark:o,end:i}=De("abort-on-property-read");o(),xt("abort-on-property-read",window,e,r,n),i()},"abort-on-property-write":function(e,t){const n=Ve(arguments),{mark:r,end:o}=De("abort-on-property-write"),i=!("false"===t);r(),$t("abort-on-property-write",window,e,n,i),o()},"array-override":function(e,t,n="false",r,i){if(!e)throw new Nt("[array-override snippet]: Missing method to override.");if(!t)throw new Nt("[array-override snippet]: Missing needle.");Wt||(Wt=new Ft);let s=Ye("array-override");const{mark:a,end:c}=De("array-override"),u=Ve(arguments);if("push"!==e||Wt.has("push"))if("includes"!==e||Wt.has("includes")){if("forEach"===e&&!Wt.has("forEach")){a();const{forEach:e}=Dt.prototype;Wt.set("forEach",Te([]));let t=l(e,(function(t,n){const r=Wt.get("forEach");return o(e,this,[function(e,i,a){for(const{needleRegex:t,pathSegments:n,stackNeedles:o,formattedArgs:i}of r)if(n.length||"string"!=typeof e&&"number"!=typeof e){if(n.length&&"object"==typeof e&&null!==e&&Bt(e,t,n)&&jt(o,s))return s("success",`Array.forEach skipped callback for object containing needle: ${t}\nFILTER: array-override ${i}`),void Ht("array-override "+i)}else{const n=e.toString();if(n.match&&n.match(t)&&jt(o,s))return s("success",`Array.forEach skipped callback for item matching needle: ${t}\nFILTER: array-override ${i}`),void Ht("array-override "+i)}return o(t,n||this,[e,i,a])},n])}));ot(t,e),It.defineProperty(window.Array.prototype,"forEach",{value:t}),s("info","Wrapped Array.prototype.forEach"),c()}}else{a();const{includes:e}=Dt.prototype;Wt.set("includes",Te([]));let t=l(e,(function(t){const n=Wt.get("includes");for(const{needleRegex:e,retVal:r,pathSegments:o,stackNeedles:i,formattedArgs:a}of n)if(o.length||"string"!=typeof t&&"number"!=typeof t){if(o.length&&"object"==typeof t&&null!==t&&Bt(t,e,o)&&jt(i,s))return s("success",`Array.includes returned ${r} for object containing ${e}\nFILTER: array-override ${a}`),Ht("array-override "+a),r}else if(t.toString().match&&t.toString().match(e)&&jt(i,s))return s("success",`Array.includes returned ${r} for ${e}\nFILTER: array-override ${a}`),Ht("array-override "+a),r;return o(e,this,arguments)}));ot(t,e),It.defineProperty(window.Array.prototype,"includes",{value:t}),s("info","Wrapped Array.prototype.includes"),c()}else{a();const{push:e}=Dt.prototype;Wt.set("push",Te([]));let t=l(e,(function(t){const n=Wt.get("push");for(const{needleRegex:e,pathSegments:r,stackNeedles:o,formattedArgs:i}of n)if(r.length||"string"!=typeof t&&"number"!=typeof t){if(r.length&&"object"==typeof t&&null!==t&&Bt(t,e,r)&&jt(o,s))return s("success",`Array.push is ignored for object containing needle: ${e}\nFILTER: array-override ${i}`),void Ht("array-override "+i)}else{const n=t.toString();if(n.match&&n.match(e)&&jt(o,s))return s("success",`Array.push is ignored for needle: ${e}\nFILTER: array-override ${i}`),void Ht("array-override "+i)}return o(e,this,arguments)}));ot(t,e),It.defineProperty(window.Array.prototype,"push",{value:t}),s("info","Wrapped Array.prototype.push"),c()}const f=Be(t);let p=[];r&&(p=r.split("."));let d=[];i&&(d=i.split(",").map((e=>e.trim())));const h=Wt.get(e),y="true"===n;h.push({needleRegex:f,retVal:y,pathSegments:p,stackNeedles:d,formattedArgs:u}),Wt.set(e,h)},"blob-override":function(e,t="",n=null){if(!e)throw new Vt("[blob-override snippet]: Missing parameter search.");const r=Ye("blob-override"),o=Ve(arguments),{mark:i,end:s}=De("blob-override");if(i(),Xt.push({match:Be(e),replaceWith:t,needle:n?Be(n):null,formattedArgs:o}),Xt.length>1)return;const a=_t;function c(e,t={}){if(Jt.isArray(e)){let t=Te(e).join("");for(const e of Te(Xt))if((!e.needle||e.needle.test(t))&&e.match.test(t)){t=t.replace(e.match,e.replaceWith),r("success",`Replaced: ${e.match} → ${e.replaceWith},\nFILTER: blob-override ${e.formattedArgs}`);const n="blob-override "+e.formattedArgs;Gt.has(n)||(Gt.add(n),Je(n))}e=[t]}const n=Ut.construct(a,[e,t]);return zt.setPrototypeOf(n,c.prototype),n}c.prototype=a.prototype,zt.setPrototypeOf(c,a),ot(c,window.Blob),window.Blob=c,r("info","Wrapped Blob constructor in context "),s()},"cookie-remover":function(e,t=!1){if(!e)throw new Kt("[cookie-remover snippet]: No cookie to remove.");const n=Ve(arguments);let r=Ye("cookie-remover");const{mark:o,end:i}=De("cookie-remover");let s=Be(e),a=!1;if(!Te(/^http|^about/).test(location.protocol))return void r("warn","Snippet only works for http or https and about.");function c(){return Te(Yt()).split(";").filter((e=>s.test(Te(e).split("=")[0])))}const l=()=>{r("info","Parsing cookies for matches"),o();for(const e of Te(c())){let t=Te(location.hostname);!t&&Te(location.ancestorOrigins)&&Te(location.ancestorOrigins[0])&&(t=new Qt(Te(location.ancestorOrigins[0])).hostname);const o=Te(e).split("=")[0],i="expires=Thu, 01 Jan 1970 00:00:00 GMT",s="path=/",c=t.split(".");for(let e=c.length;e>0;e--){const t=c.slice(c.length-e).join(".");Yt(`${Te(o).trim()}=;${i};${s};domain=${t}`),Yt(`${Te(o).trim()}=;${i};${s};domain=.${t}`),r("success",`Set expiration date on ${o}`,"\nFILTER: cookie-remover",n),a||(a=!0,Je("cookie-remover "+n))}}i()};if(l(),t){let e=c();setInterval((()=>{let t=c();if(t!==e)try{l()}finally{e=t}}),1e3)}},debug:function(e){ze=!0,e&&(Ue=Be(e))},"event-override":function(e,t,n=null){const r=Ve(arguments),i={eventType:e,mode:t,needle:n?Be(n):null,formattedArgs:r};if(an.includes(i)||an.push(i),an.length>1)return;let a=Ye("[event-override]");const{mark:c,end:u}=De("event-override"),f=en.getOwnPropertyDescriptor(window.EventTarget.prototype,"addEventListener");if(f.configurable){let e=l(rn,(function(e,t,n){c();const r=an.filter((t=>t.eventType===e));if(!r.length||e!==r[0].eventType)return u(),o(rn,this,arguments);const i=r.find((e=>"disable"===e.mode&&(!e.needle||e.needle.test(t.toString()))));if(i)return a("success",`Disabling ${i.eventType} event, \nFILTER: event-override ${i.formattedArgs}`),ln("event-override "+i.formattedArgs),void u();const l=r.filter((e=>"trusted"===e.mode&&(!e.needle||e.needle.test(t.toString()))));if("function"!=typeof t&&(!t||"function"!=typeof t.handleEvent)||!l.length||e!==l[0].eventType)return u(),o(rn,this,arguments);const f=function(e){const n=new Proxy(e,{get(t,n){if("isTrusted"===n)return a("success",`Providing trusted value for ${e.type} event`),ln("event-override "+l[0].formattedArgs),!0;const r=tn.get(t,n);return"function"==typeof r?function(...e){return o(r,t,e)}:r}});return"function"==typeof t?s(t,this,n):s(t.handleEvent,t,n)};return f.originalListener=t,sn.has(t)||sn.set(t,new Zt),sn.get(t).set(e,f),a("info",`\nWrapping event listener for ${e}`),u(),o(rn,this,[e,f,n])}));ot(e,rn),en.defineProperty(window.EventTarget.prototype,"addEventListener",{...f,value:e})}const p=en.getOwnPropertyDescriptor(window.EventTarget.prototype,"removeEventListener");if(p.configurable){let e=l(on,(function(e,t,n){if(t&&sn.has(t)&&sn.get(t).has(e)){const r=sn.get(t).get(e);return sn.get(t).delete(e),o(on,this,[e,r,n])}return o(on,this,arguments)}));ot(e,on),en.defineProperty(window.EventTarget.prototype,"removeEventListener",{...p,value:e})}a("info","Initialized event-override snippet")},"freeze-element":function(e,t="",...n){const r=Ve(arguments);let i,a,c=!1,l=!1,u=Te(n).filter((e=>!y(e))),f=Te(n).filter((e=>y(e))).map(Be),p=_e(),d=Cn(e);!function(){let n=Te(t).split("+");1===n.length&&""===n[0]&&(n=[]);for(let t of n)switch(t){case"subtree":c=!0;break;case"abort":l=!0;break;default:throw new Bn("[freeze] Unknown option passed to the snippet. [selector]: "+e+" [option]: "+t)}}();let h={selector:e,shouldAbort:l,rid:p,exceptionSelectors:u,regexExceptions:f,changeId:0};function y(e){return e.length>=2&&"/"==e[0]&&"/"==e[e.length-1]}function g(){a=d(),w(a,!1)}function w(e,t=!0){for(let n of e)qn.frozen.has(n)||(qn.frozen.set(n,h),!t&&c&&new Jn((e=>{for(let t of Te(e))w(Te(t,"MutationRecord").addedNodes)})).observe(n,{childList:!0,subtree:!0}),c&&Te(n).nodeType===Mn&&w(Te(n).childNodes))}function m(e,...t){Qe(`[freeze][${e}] `,...t)}function v(e,t,n,r){let o=r.selector,i=r.changeId,s="string"==typeof e,a=r.shouldAbort?"aborting":"watching";switch(Wn.groupCollapsed(`[freeze][${i}] ${a}: ${o}`),n){case"appendChild":case"append":case"prepend":case"insertBefore":case"replaceChild":case"insertAdjacentElement":case"insertAdjacentHTML":case"insertAdjacentText":case"innerHTML":case"outerHTML":m(i,s?"text: ":"node: ",e),m(i,"added to node: ",t);break;case"replaceWith":case"after":case"before":m(i,s?"text: ":"node: ",e),m(i,"added to node: ",Te(t).parentNode);break;case"textContent":case"innerText":case"nodeValue":m(i,"content of node: ",t),m(i,"changed to: ",e)}m(i,`using the function "${n}"`),Wn.groupEnd(),r.changeId++}function b(e,t){if(t)for(let n of t)if(n.test(e))return!0;return!1}qn.frozen.has(document)||(qn.frozen.set(document,!0),function(){let e;function t(e){return e&&qn.frozen.has(e)}function n(e){try{return e&&(qn.frozen.has(e)||qn.frozen.has(Te(e).parentNode))}catch(e){return!1}}function r(e,t){try{return e&&(qn.frozen.has(e)&&t||qn.frozen.has(Te(e).parentNode)&&!t)}catch(e){return!1}}function o(e){return qn.frozen.get(e)}function i(e){try{if(qn.frozen.has(e))return qn.frozen.get(e);let t=Te(e).parentNode;return qn.frozen.get(t)}catch(e){}}function s(e,t){try{if(qn.frozen.has(e)&&t)return qn.frozen.get(e);let n=Te(e).parentNode;return qn.frozen.get(n)}catch(e){}}e=k(In,"appendChild",t,o),Et(In,"appendChild",e),e=k(In,"insertBefore",t,o),Et(In,"insertBefore",e),e=k(In,"replaceChild",t,o),Et(In,"replaceChild",e),e=P(Dn,"append",t,o),Et(Dn,"append",e),e=P(Dn,"prepend",t,o),Et(Dn,"prepend",e),e=P(Dn,"replaceWith",n,i),Et(Dn,"replaceWith",e),e=P(Dn,"after",n,i),Et(Dn,"after",e),e=P(Dn,"before",n,i),Et(Dn,"before",e),e=O(Dn,"insertAdjacentElement",r,s),Et(Dn,"insertAdjacentElement",e),e=O(Dn,"insertAdjacentHTML",r,s),Et(Dn,"insertAdjacentHTML",e),e=O(Dn,"insertAdjacentText",r,s),Et(Dn,"insertAdjacentText",e),e=T(Dn,"innerHTML",t,o),Et(Dn,"innerHTML",e),e=T(Dn,"outerHTML",n,i),Et(Dn,"outerHTML",e),e=j(In,"textContent",t,o),Et(In,"textContent",e),e=j(Fn,"innerText",t,o),Et(Fn,"innerText",e),e=j(In,"nodeValue",t,o),Et(In,"nodeValue",e)}()),i=new Jn(g),i.observe(document,{childList:!0,subtree:!0}),g();let E=!1;function S(e){throw E||(E=!0,Je("freeze-element "+r)),new Vn(e)}function x(e,t,n,r){let o=new Hn,{body:i}=Te(o.parseFromString(e,"text/html")),s=$(Te(i).childNodes,t,n,r);return Te(s).map((e=>{switch(Te(e).nodeType){case Mn:return Te(e).outerHTML;case Nn:return Te(e).textContent;default:return""}})).join("")}function $(e,t,n,r){let o=Te([]);for(let i of e)R(i,t,n,r)&&o.push(i);return o}function R(e,t,n,r){let o=r.shouldAbort,i=r.regexExceptions,s=r.exceptionSelectors,a=r.rid;if("string"==typeof e){let s=e;return!!b(s,i)||(Xe()&&v(s,t,n,r),o&&S(a),Xe())}let c=e;switch(Te(c).nodeType){case Mn:return!!function(e,t){if(t){let n=Te(e);for(let e of t)if(n.matches(e))return!0}return!1}(c,s)||(o&&(Xe()&&v(c,t,n,r),S(a)),!!Xe()&&(Ln(c),v(c,t,n,r),!0));case Nn:return!!b(Te(c).textContent,i)||(Xe()&&v(c,t,n,r),o&&S(a),!1);default:return!0}}function k(e,t,n,r){let i=zn(e,t)||{},a=i.get&&s(i.get,e)||i.value;if(a)return{get:()=>function(...e){if(n(this)){let n=r(this);if(n){let r=e[0];if(!R(r,this,t,n))return r}}return o(a,this,e)}}}function P(e,t,n,r){let i=zn(e,t)||{},a=i.get&&s(i.get,e)||i.value;if(a)return{get:()=>function(...e){if(!n(this))return o(a,this,e);let i=r(this);if(!i)return o(a,this,e);let s=$(e,this,t,i);return s.length>0?o(a,this,s):void 0}}}function O(e,t,n,r){let i=zn(e,t)||{},a=i.get&&s(i.get,e)||i.value;if(a)return{get:()=>function(...e){let[i,c]=e,l="afterbegin"===i||"beforeend"===i;if(n(this,l)){let e=r(this,l);if(e){let n,r=l?this:Te(this).parentNode;switch(t){case"insertAdjacentElement":if(!R(c,r,t,e))return c;break;case"insertAdjacentHTML":return n=x(c,r,t,e),n?s(a,this,i,n):void 0;case"insertAdjacentText":if(!R(c,r,t,e))return}}}return o(a,this,e)}}}function T(e,t,n,r){let o=zn(e,t)||{},{set:i}=o;if(i)return{set(e){if(!n(this))return s(i,this,e);let o=r(this);if(!o)return s(i,this,e);let a=x(e,this,t,o);return a?s(i,this,a):void 0}}}function j(e,t,n,r){let o=zn(e,t)||{},{set:i}=o;if(i)return{set(e){if(!n(this))return s(i,this,e);let o=r(this);return o?R(e,this,t,o)?s(i,this,e):void 0:s(i,this,e)}}}},"hide-if-canvas-contains":function(e,t="canvas",n="",r=""){const i=Ye("hide-if-canvas-contains"),s=Ve(arguments),{mark:a,end:c}=De("hide-if-canvas-contains");if(!e)return void i("error","The parameter 'search' is required");if(!nr){a();const f=Un.prototype;function p(e){const t=f[e];let n=l(t,(function(e,...n){const r=this.canvas;if(or.has(r))return o(t,this,[e,...n]);const i=((rr.get(r)||"")+e).slice(-1e4);rr.set(r,i);for(const[e,t]of nr)"data"!==t.mode&&e.test(i)&&pr(r,t);const s=o(t,this,[e,...n]);return dr(r),s}));ot(n,t),Qn.defineProperty(window.CanvasRenderingContext2D.prototype,e,{value:n})}function d(){const e=f.clearRect;let t=l(e,(function(...t){let n=!1,r=!0;for(const{clearRectBehavior:e}of nr.values())"always"===e&&(n=!0),"never"!==e&&(r=!1);if(!r){const[e,r,o,i]=t,s=e<=0&&r<=0&&o>=this.canvas.width&&i>=this.canvas.height;(n||s)&&rr.delete(this.canvas)}const i=o(e,this,t);return dr(this.canvas),i}));ot(t,e),Qn.defineProperty(window.CanvasRenderingContext2D.prototype,"clearRect",{value:t})}function h(){const e=f.drawImage;let t=l(e,(function(t,...n){if(i("info","drawImage called with arguments:",t,...n),t&&"string"==typeof t.src&&t.src)for(const[e,n]of nr)"data"!==n.mode&&e.test(t.src)&&pr(this.canvas,n);const r=o(e,this,[t,...n]);return dr(this.canvas),r}));ot(t,e),Qn.defineProperty(window.CanvasRenderingContext2D.prototype,"drawImage",{value:t})}i("info","CanvasRenderingContext2D proxied"),p("fillText"),p("strokeText"),d(),h(),nr=new Gn;new Kn((e=>{for(let t of Te(e))"childList"===t.type&&ir.forEach((e=>{const t=Te(e.canvasElement).closest(e.rule.selector);if(t&&!sr.has(t)){Ln(t),sr.add(t),ir.delete(e),Ye("hide-if-canvas-contains")("success","Matched: ",t,`\nFILTER: hide-if-canvas-contains ${e.rule.formattedArguments}`);const n="hide-if-canvas-contains "+e.rule.formattedArguments;ar.has(n)||(ar.add(n),Je(n))}}))})).observe(Xn,{childList:!0,subtree:!0}),c()}const u=Be(e);if(nr.set(u,{selector:t,formattedArguments:s,clearRectBehavior:n,mode:r}),"data"===r){cr=!0,function(){if(lr)return;lr=!0;const e=Un.prototype,t=["fillRect","strokeRect","putImageData","fill","stroke"];for(const n of t){const t=e[n];if("function"!=typeof t)continue;let r=l(t,(function(...e){const n=o(t,this,e);return dr(this.canvas),n}));ot(r,t),Qn.defineProperty(window.CanvasRenderingContext2D.prototype,n,{value:r})}}();for(const y of $n("canvas"))dr(y)}},"hide-if-shadow-contains":function(e,t="*"){const n=Ve(arguments);let r=`${e}\\${t}`;xr.has(r)||xr.set(r,[Be(e),t,Ke,n]);const i=Ye("hide-if-shadow-contains"),{mark:s,end:a}=De("hide-if-shadow-contains");if(!Rr){Rr=new gr((e=>{s();let t=new mr;for(let{target:n}of Te(e)){let e=Te(n).parentNode;for(;e;)[n,e]=[e,Te(n).parentNode];if(!Sr.has(n)&&!t.has(n)){t.add(n);for(let[e,t,r,o]of xr.values())if(e.test(Te(n).textContent)){let e=Te(n.host).closest(t);if(e){r(),Te(n).appendChild(document.createElement("style")).textContent=":host {display: none !important}",Ln(e),Sr.add(n),i("success","Hiding: ",e,`\nFILTER: hide-if-shadow-contains ${o}`);const t="hide-if-shadow-contains "+o;$r.has(t)||($r.add(t),Je(t))}a()}}}}));let e=l(Er,(function(){let e=o(Er,this,arguments);return i("info","attachShadow is called for: ",e),Rr.observe(e,{childList:!0,characterData:!0,subtree:!0}),e}));ot(e,Er),wr.defineProperty(br,"attachShadow",{value:e})}},"json-override":function(e,t,n="",r=""){if(!e)throw new Cr("[json-override snippet]: Missing paths to override.");if(void 0===t)throw new Cr("[json-override snippet]: No value to override with.");let i=Ye("json-override");const{mark:s,end:a}=De("json-override");if(!Fr){function p(e,t){for(let{formattedArgs:n,prune:r,jsonPathObjects:o,needle:s,filter:a,value:c}of Fr.values())if(!a||a.test(t)){if(Te(s).some((t=>!Pt(e,t))))return e;for(let t of r)if(t.startsWith("jsonpath("))try{const r=o.get(t);r.evaluate(e).forEach((({parent:e,key:t})=>{i("success",`JSONPath match found at [${t}], replaced with ${c}`,`\nFILTER: json-override ${n}`),qr("json-override "+n),e[t]=Tt(c)}))}catch(e){i("error",`JSONPath evaluation failed for: ${t}. Error: ${e.message}`)}else t.includes("{}")||t.includes("[]")?d(e,t,c,n):h(e,t,c,n)}return e}function d(e,t,n,r){let o=Te(t).split("."),s=e;for(let e=0;e<o.length;e++){let a=o[e];if("[]"===a)return void(Lr.isArray(s)&&(i("info",`Iterating over array at: ${a}`),Te(s).forEach((t=>{null!=t&&d(t,o.slice(e+1).join("."),n,r)}))));if("{}"===a)return void(s&&"object"==typeof s&&(i("info",`Iterating over object at: ${a}`),Ir.keys(s).forEach((t=>{let i=s[t];null!=i&&d(i,o.slice(e+1).join("."),n,r)}))));if(!s||"object"!=typeof s||!m(s,a))return;e===o.length-1?(i("success",`Found ${t}, replaced it with ${n}`,`\nFILTER: json-override ${r}`),qr("json-override "+r),s[a]=Tt(n)):s=s[a]}}function h(e,t,n,r){let o=Pt(e,t);void 0!==o&&(i("success",`Found ${t}, replaced it with ${n}`,`\nFILTER: json-override ${r}`),qr("json-override "+r),o[0][o[1]]=Tt(n))}s();let{parse:y}=Mr;Fr=new Nr;let g=l(y,(function(e){return p(o(y,this,arguments),e)}));ot(g,y),Ir.defineProperty(window.JSON,"parse",{value:g}),i("info","Wrapped JSON.parse for override");let{json:w}=Dr.prototype;Ir.defineProperty(window.Response.prototype,"json",{value:l(w,(function(e){return o(w,this,arguments).then((t=>p(t,e)))}))}),i("info","Wrapped Response.json for override"),a()}const c=Ve(arguments),u=Te(e).split(/ +/),f=new Nr;for(const v of u)if(v.startsWith("jsonpath("))try{f.set(v,new Ar(v.slice(9,-1)))}catch(b){i("error",`Invalid JSONPath query: ${v}. Error: ${b.message}`)}Fr.set(e,{formattedArgs:c,prune:u,jsonPathObjects:f,needle:n.length?Te(n).split(/ +/):[],filter:r?Be(r):null,value:t})},"json-prune":function(e,t="",n=""){if(!e)throw new Br("Missing paths to prune");let r=Ye("json-prune");const{mark:i,end:s}=De("json-prune");if(!Ur){function f(e){for(let{prune:t,needle:n,jsonPathObjects:o,stackNeedle:i,formattedArgs:s}of Ur.values()){if(Te(n).length>0&&Te(n).some((t=>!Pt(e,t))))return e;if(Te(i)&&Te(i).length>0&&!jt(i,r))return e;for(let n of t)if(n.startsWith("jsonpath("))try{const t=o.get(n);t.evaluate(e).forEach((({parent:e,key:t})=>{r("success",`JSONPath match found and deleted at [${t}]`,`\nFILTER: json-prune ${s}`),Gr("json-prune "+s),delete e[t]}))}catch(e){r("error",`JSONPath evaluation failed for: ${n}. Error: ${e.message}`)}else n.includes("{}")||n.includes("[]")||n.includes("{-}")||n.includes("[-]")?p(e,n,s):h(e,n,s)}return e}function p(e,t,n){let o=Te(t).split("."),i=e;for(let e=0;e<o.length;e++){let s=o[e];if("[]"===s)return void(Hr.isArray(i)&&(r("info",`Iterating over array at: ${s}`),Te(i).forEach((t=>p(t,o.slice(e+1).join("."),n)))));if("[-]"===s){if(Hr.isArray(i)){r("info",`Iterating over array with element removal at: ${s}`);let t=o.slice(e+1).join("."),a=[];Te(i).forEach(((e,n)=>{d(e,t)&&a.push(n)}));for(let e=a.length-1;e>=0;e--)r("success",`Found element at index ${a[e]} matching ${t} and removed entire element, \nFILTER: json-prune ${n}`),Gr("json-prune "+n),i.splice(a[e],1)}return}if("{}"===s)return void("object"==typeof i&&null!==i&&(r("info",`Iterating over object at: ${s}`),Vr.keys(i).forEach((t=>p(i[t],o.slice(e+1).join("."),n)))));if("{-}"===s){if("object"==typeof i&&null!==i){r("info",`Iterating over object with element removal at: ${s}`);let t=o.slice(e+1).join("."),a=[];Vr.keys(i).forEach((e=>{d(i[e],t)&&a.push(e)})),a.forEach((e=>{r("success",`Found object key ${e} matching ${t} and removed entire element, \nFILTER: json-prune ${n}`),Gr("json-prune "+n),delete i[e]}))}return}if(!i||"object"!=typeof i||!m(i,s))return;e===o.length-1?(r("success",`Found ${t} and deleted, \nFILTER: json-prune ${n}`),Gr("json-prune "+n),delete i[s]):i=i[s]}}function d(e,t){if(!t||""===t)return!0;let n=Te(t).split("."),r=e;for(let e=0;e<n.length;e++){let t=n[e];if("[]"===t)return!!Hr.isArray(r)&&Te(r).some((t=>d(t,n.slice(e+1).join("."))));if("{}"===t)return"object"==typeof r&&null!==r&&Vr.keys(r).some((t=>d(r[t],n.slice(e+1).join("."))));if(!r||"object"!=typeof r||!m(r,t))return!1;if(e===n.length-1)return!0;r=r[t]}return!1}function h(e,t,n){let o=Pt(e,t);void 0!==o&&(r("success",`Found ${t} and deleted`,`\nFILTER: json-prune ${n}`),Gr("json-prune "+n),delete o[0][o[1]])}i();let{parse:y}=Jr;Ur=new _r;let g=l(y,(function(){return f(o(y,this,arguments))}));ot(g,y),Vr.defineProperty(window.JSON,"parse",{value:g}),r("info","Wrapped JSON.parse for prune");let{json:w}=zr.prototype,v=l(w,(function(){return o(w,this,arguments).then((e=>f(e)))}));ot(v,w),Vr.defineProperty(window.Response.prototype,"json",{value:v}),r("info","Wrapped Response.json for prune"),s()}const a=Ve(arguments),c=Te(e).split(/ +/),u=new _r;for(const b of c)if(b.startsWith("jsonpath("))try{u.set(b,new Ar(b.slice(9,-1)))}catch(E){r("error",`Invalid JSONPath query: ${b}. Error: ${E.message}`)}Ur.set(e,{formattedArgs:a,prune:c,jsonPathObjects:u,needle:t.length?Te(t).split(/ +/):[],stackNeedle:n.length?Te(n).split(/ +/):[]})},"map-override":function(e,t,n="",r,i){if(!e)throw new Kr("[map-override snippet]: Missing method to override.");if(!t)throw new Kr("[map-override snippet]: Missing needle.");Zr||(Zr=new Yr);let a=Ye("map-override");const{mark:c,end:u}=De("map-override"),{set:f,get:p,has:d}=Yr.prototype,h=Ve(arguments);if("set"!==e||Zr.has("set"))if("get"!==e||Zr.has("get")){if("has"===e&&!Zr.has("has")){c(),s(f,Zr,"has",Te([]));let e=l(d,(function(e){const t=s(p,Zr,"has");for(const{needleRegex:n,retVal:r,stackNeedles:o}of t)if("string"==typeof e||"number"==typeof e){const t=e.toString();if(n.test(t)&&jt(o,a))return a("success",`Map.has returned ${r} for key: ${t}\nFILTER: map-override ${h}`),to("map-override "+h),r}return o(d,this,arguments)}));ot(e,d),Qr.defineProperty(window.Map.prototype,"has",{value:e}),a("info","Wrapped Map.prototype.has"),u()}}else{c(),s(f,Zr,"get",Te([]));let e=l(p,(function(e){const t=s(p,Zr,"get");for(const{needleRegex:n,retVal:r,stackNeedles:o}of t)if("string"==typeof e||"number"==typeof e){const t=e.toString();if(n.test(t)&&jt(o,a))return a("success",`Map.get returned ${r} for key: ${t}\nFILTER: map-override ${h}`),to("map-override "+h),r}return o(p,this,arguments)}));ot(e,p),Qr.defineProperty(window.Map.prototype,"get",{value:e}),a("info","Wrapped Map.prototype.get"),u()}else{c(),s(f,Zr,"set",Te([]));let e=l(f,(function(e,t){const n=s(p,Zr,"set");for(const{needleRegex:e,pathSegments:r,stackNeedles:o}of n)if(no(t,e,r)&&jt(o,a))return a("success",`Map.set is ignored for value matching needle: ${e}\nFILTER: map-override ${h}`),to("map-override "+h),this;return o(f,this,arguments)}));ot(e,f),Qr.defineProperty(window.Map.prototype,"set",{value:e}),a("info","Wrapped Map.prototype.set"),u()}const y=Be(t);let g=[];r&&(g=r.split("."));let w=[];i&&(w=i.split(",").map((e=>e.trim())));const m=s(p,Zr,e);let v;"get"===e?v=""===n?void 0:n:"has"===e&&(v="true"===n),m.push({needleRegex:y,retVal:v,pathSegments:g,stackNeedles:w}),s(f,Zr,e,m)},"override-property-read":function(e,t,n){if(!e)throw new ro("[override-property-read snippet]: No property to override.");if(void 0===t)throw new ro("[override-property-read snippet]: No value to override with.");const r=Ve(arguments);let o=Ye("override-property-read");const{mark:i,end:s}=De("override-property-read");let a=Tt(t),c=!1;o("info",`Overriding ${e}.`);const l=!("false"===n);i(),Et(window,e,{get:()=>(o("success",`${e} override done.`,"\nFILTER: override-property-read",r),c||(c=!0,Je("override-property-read "+r)),a),set(){}},l),s()},"prevent-element-src-loading":function(e,t){if(!e||"string"!=typeof e)throw new so("[prevent-element-src-loading snippet]: tagName param must be a string.");if(!t)throw new so("[prevent-element-src-loading snippet]: Missing search parameter.");if(e=Te(e).toString().toLowerCase(),!Te(["script","img","iframe","link"]).includes(e))throw new so("[prevent-element-src-loading snippet]: tagName parameter is incorrect.");const n={script:"data:text/javascript;base64,KCk9Pnt9",img:"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",iframe:"data:text/html;base64,PGRpdj48L2Rpdj4=",link:"data:text/plain;base64,"},r={script:window.HTMLScriptElement,img:window.HTMLImageElement,iframe:window.HTMLIFrameElement,link:window.HTMLLinkElement}[e],o="link"===e?"href":"src",i="onerror",s=Ye("[prevent-element-src-loading snippet]"),a=Ve(arguments),c="prevent-element-src-loading "+a,{mark:l,end:u}=De("prevent-element-src-loading");l();const f=Be(t);if(po.push({tagName:e,searchRegex:f}),s("info",`Added filter rule\nFILTER: prevent-element-src-loading ${a}`),!yo.has(e)){yo.add(e);const t={apply:(e,t,r)=>{if(!r[0]||!r[1])return co.apply(e,t,r);const i=t.nodeName.toLowerCase(),a=r[0].toLowerCase(),l=r[1];return a===o&&po.some((e=>i===e.tagName&&e.searchRegex.test(l)))?(fo.add(t),s("success",`Replaced setAttribute for ${a}: ${l} → ${n[i]}`),ho.has(c)||(ho.add(c),Je(c)),co.apply(e,t,[a,n[i]])):co.apply(e,t,r)}};r.prototype.setAttribute=new Proxy(r.prototype.setAttribute,t),s("info","Wrapped setAttribute function");const i=ao.getOwnPropertyDescriptor(r.prototype,o);if(!i)return;ao.defineProperty(r.prototype,o,{enumerable:!0,configurable:!0,get(){return i.get.call(this)},set(e){const t=this.nodeName.toLowerCase();po.some((n=>t===n.tagName&&n.searchRegex.test(e)))?(fo.add(this),s("success",`Replaced in src/href setter ${e} → ${n[t]}`),ho.has(c)||(ho.add(c),Je(c)),i.set.call(this,n[t])):i.set.call(this,e)}}),s("info","Wrapped src/href property setter")}if(1===po.length){const e=ao.getOwnPropertyDescriptor(HTMLElement.prototype,i);if(!e)return;ao.defineProperty(HTMLElement.prototype,i,{enumerable:!0,configurable:!0,get(){return e.get.call(this)},set(t){fo.has(this)?(s("success",`Replaced in onerror setter ${t} → () => {}`),ho.has(c)||(ho.add(c),Je(c)),e.set.call(this,(()=>{}))):e.set.call(this,t)}}),s("info","Wrapped onerror property setter");const t={apply:(e,t,n)=>{if(!n[0]||!n[1]||!t)return co.apply(e,t,n);const r=n[0];return"function"==typeof t.getAttribute&&fo.has(t)&&"error"===r?(s("success",`Replaced error event handler on ${t} with () => {}`),ho.has(c)||(ho.add(c),Je(c)),co.apply(e,t,[r,()=>{}])):co.apply(e,t,n)}};EventTarget.prototype.addEventListener=new Proxy(EventTarget.prototype.addEventListener,t),s("info","Wrapped addEventListener");(()=>{io("error",(e=>{const t=e.target;if(!t||!t.nodeName)return;const n=t.src||t.href,r=t.nodeName.toLowerCase();po.some((e=>r===e.tagName&&n&&e.searchRegex.test(n)))&&(t.onerror=()=>{})}),!0),s("info","Added event listener to defuse global errors")})()}u()},"prevent-listener":function(e,t,n){if(!e)throw new go("[prevent-listener snippet]: No event type.");if(!xo){xo=new wo;let e=Ye("[prevent]");const{mark:t,end:n}=De("prevent-listener");let r=l(So,(function(r,i){t();for(let{evt:t,handlers:n,selectors:o,formattedArgs:a}of xo.values()){if(!t.test(r))continue;let c=this instanceof Element;for(let l=0;l<n.length;l++){const u=n[l],f=o[l];if(f&&(!c||!Te(this).matches(f)))continue;if(u){const t=function(){try{const e=String("function"==typeof i?i:i.handleEvent);return u.test(e)}catch(t){return e("error","Error while trying to stringify listener: ",t),!1}};if(!function(){try{const e=s(bo,"function"==typeof i?i:i.handleEvent);return u.test(e)}catch(t){return e("error","Error while trying to stringify listener: ",t),!1}}()&&!t())continue}const p="prevent-listener "+a;return $o.has(p)||($o.add(p),Je(p)),void(Xe()&&(vo.groupCollapsed("DEBUG [prevent] was successful",`\nFILTER: prevent-listener ${a}`),e("success",`type: ${r} matching ${t}`),e("success","handler:",i),u&&e("success",`matching ${u}`),f&&e("success","on element: ",this,` matching ${f}`),e("success","was prevented from being added"),vo.groupEnd()))}}return n(),o(So,this,arguments)}));ot(r,So),mo.defineProperty(Eo,"addEventListener",{value:r}),e("info","Wrapped addEventListener")}const r=Ve(arguments);xo.has(e)||xo.set(e,{evt:Be(e),handlers:[],selectors:[],formattedArgs:r});let{handlers:i,selectors:a}=xo.get(e);i.push(t?Be(t):null),a.push(n)},"prevent-window-open":function(e="",t="",n="iframe"){if(""===n&&(n="iframe"),"iframe"!==n&&"obj"!==n&&"blank"!==n)throw new Mo("[prevent-window-open snippet]: decoy must be iframe, obj or blank.");let r=!1;if(Te(e).startsWith("!")&&(r=!0,e=Te(e).slice(1)),Ho.push({regex:Be(e),invert:r,hasDelay:""!==t,autoRemoveAfter:Wo(t)||0,decoy:n,formattedArgs:Ve(arguments)}),Ho.length>1)return;const i=Ye("[prevent-window-open]"),{mark:s,end:a}=De("prevent-window-open"),c=Io.getOwnPropertyDescriptor(window,"open");if(!c||"function"!=typeof c.value||!c.configurable)return void i("warn","window.open not wrappable, bailing out");const u=c.value,f=(e=0,t=(()=>{}))=>{let n=!1;const r=()=>{n||(n=!0,t())};qo(r,e);const o={href:"about:blank",assign(){},replace(){},reload(){},toString:()=>"about:blank"},i={location:o,defaultView:null,cookie:"",open(){},write(){},writeln(){},close(){}},s={length:0,state:null,scrollRestoration:"auto",back(){},forward(){},go(){},pushState(){},replaceState(){}},a=new No,c=Io.create(Io.create(null)),l=new Ro(c,{get(e,t,c){if(jo(e,t))return To(e,t,c);if("closed"===t)return n;if("close"===t)return r;if("opener"===t)return window;if("frameElement"===t)return null;if(t===ko)return"Window";if("parent"===t||"top"===t||"self"===t||"window"===t||"globalThis"===t||"frames"===t)return c;if("location"===t)return o;if("document"===t)return i;if("history"===t)return s;let l;try{l=To(window,t)}catch(e){return}if("function"==typeof l){let e=a.get(t);return e||(e=()=>{},a.set(t,e)),e}return null===l||"object"!=typeof l?l:void 0},set:(e,t,n)=>"location"===t||"opener"===t||(!!_o.has(t)||Lo(e,t,n)),defineProperty:(e,t,n)=>!_o.has(t)&&Po(e,t,n),deleteProperty:(e,t)=>Oo(e,t),has:(e,t)=>_o.has(t)||Ao(e,t)||Ao(window,t),setPrototypeOf:()=>!1,preventExtensions:()=>!1});return i.defaultView=l,l},p=l(u,(function(e){s();const t=new Co(arguments.length);for(let e=0;e<arguments.length;e++)t[e]=arguments[e];const n=t.join(" ");for(let r=0;r<Ho.length;r++){const s=Ho[r];if(s.regex.test(n)===s.invert)continue;if(Jo("prevent-window-open "+s.formattedArgs),i("success",`Prevented window.open(${n})`,`\nFILTER: prevent-window-open ${s.formattedArgs}`),a(),!s.hasDelay)return null;if("blank"===s.decoy){t[0]="about:blank";const e=o(u,this,t),n=e&&e.close;return"function"==typeof n&&qo((()=>o(n,e,[])),s.autoRemoveAfter),e}const c="obj"===s.decoy?"object":"iframe",l="obj"===s.decoy?"data":"src";let p;try{p=Te(Fo).createElement(c),p[l]=null==e?"about:blank":e;const{style:t}=Te(p,"HTMLElement"),n=Te(t,"CSSStyleDeclaration");n.setProperty("height","1px","important"),n.setProperty("position","fixed","important"),n.setProperty("top","-1px","important"),n.setProperty("width","1px","important");const r=Te(Fo).body||Te(Fo).documentElement;Te(r).appendChild(p)}catch(e){if(p)try{Te(p).remove()}catch(e){}return f(s.autoRemoveAfter)}return f(s.autoRemoveAfter,(()=>Te(p).remove()))}return i("info",`Allowed window.open(${n})`),a(),o(u,this,arguments)}));ot(p,u),Io.defineProperty(window,"open",{...c,value:p}),i("info","Wrapped window.open")},profile:function(){Ie=!1},"replace-argument":function(e,t,n="",r="",i=""){const s=Ye("[replace-argument snippet]"),a="replace-argument "+Ve(arguments),{mark:c,end:u}=De("replace-argument");if(!e||"string"!=typeof e)return void s("error",`methodPath param must be a string.\nFILTER: ${a}`);const f=""+t;if(!/^\d+$/.test(f))return void s("error",`argPosition param must be a non-negative integer.\nFILTER: ${a}`);const p=Xo(f,10),d=Te(e).split("."),h=d[d.length-1];let y=window;for(let e=0;e<d.length-1&&null!=y;e++)y=y[d[e]];if(null==y||"function"!=typeof y[h])return void s("warn",`could not resolve ${e}\nFILTER: ${a}`);const g=i?Te(i).split(",").map((e=>e.trim())):[],w=""===n,m={argPosition:p,search:w?null:ei(n),replacement:r,wholeValue:w,filterStr:a,stackNeedles:g};let v=Qo.get(e);if(v||(v=new Vo,Qo.set(e,v)),v.push(m),s("info",`Added rule for ${e}\nFILTER: ${a}`),!Yo.has(e)){c(),Yo.add(e);const t=y[h],n=l(t,(function(){let n=arguments;try{const t=Qo.get(e);if(t)for(const r of t){if(arguments.length<=r.argPosition||!jt(r.stackNeedles,s))continue;const t=arguments[r.argPosition];let o;if(r.wholeValue)o=Tt(r.replacement);else{if(null!==t&&"object"==typeof t)continue;const e=""+t;if(o=Te(e).replace(r.search,r.replacement).toString(),o===e)continue}const i=Vo.from(arguments);i[r.argPosition]=o,Zo.has(r.filterStr)||(Zo.add(r.filterStr),Je(r.filterStr)),s("success",`argument ${r.argPosition} of ${e} replaced\nFILTER: ${r.filterStr}`),n=i;break}}catch(e){n=arguments}return o(t,this,n)}));ot(n,t),Uo.defineProperty(y,h,{value:n}),s("info",`${e} wrapped`),u()}},"replace-fetch-response":function(e,t="",n=null){const r=Ve(arguments),o=Ye("replace-fetch-response"),{mark:i,end:s}=De("replace-fetch-response");if(!e)return void o("error","The parameter 'search' is required");if(!ai){const e=e=>{i();return Te(e).clone().text().then((t=>{let n=Te(t);for(const[e,{replacement:t,needle:r,formattedArgs:i}]of ai){if(r){if(!Be(r).test(n)){Xe()&&(console.groupCollapsed(`DEBUG [replace-fetch-response] warn: '${r}' not found in fetch response`),o("warn",`${n}`),console.groupEnd());continue}Xe()&&(console.groupCollapsed(`DEBUG [replace-fetch-response] success: '${r}' found in fetch response`),o("info",`${n}`),console.groupEnd())}const s=n.toString();if(n=n.replace(e,t),n.toString()!==s){const r="replace-fetch-response "+i;pi.has(r)||(pi.add(r),Je(r)),Xe()&&(console.groupCollapsed(`DEBUG [replace-fetch-response] success: '${e}' replaced with '${t}' in fetch response`,`\nFILTER: replace-fetch-response ${i}`),o("success",`${n}`),console.groupEnd())}}if(n.toString()===t.toString())return e;const r=new fi(n.toString(),{status:e.status,statusText:e.statusText,headers:e.headers});return li.defineProperties(r,{ok:{value:e.ok},redirected:{value:e.redirected},type:{value:e.type},url:{value:e.url}}),s(),r}))};ai=new ci,o("info","Network API proxied"),si(e)}const a=Be(e),c=new ui(a,"g");ai.set(c,{replacement:t,needle:n,formattedArgs:r})},"replace-outbound-value":function(e,t="",n="",r="",i="",s=""){if(!e)throw new di("[replace-outbound-value snippet]: Missing method path.");let a=Ye("replace-outbound-value");const{mark:c,end:u}=De("replace-outbound-value"),f=Ve(arguments);let p=!1;function d(){p||(p=!0,Je("replace-outbound-value "+f))}function h(e,t,n,r){if("base64"===r)try{if(function(e){try{if(""===e)return!1;const t=yi(e),n=gi(t),r=Te(e).replace(/=+$/,"").toString();return Te(n).replace(/=+$/,"").toString()===r}catch(e){return!1}}(e)){const r=yi(e);a("info",`Decoded base64 content: ${r}`);const o=t?Te(r).replace(t,n).toString():r;a("info",o!==r?`Modified decoded content: ${o}`:"Decoded content was not modified");const i=gi(o);return a("info",`Re-encoded to base64: ${i}`),i}a("info",`Content is plain text: ${e}`);const r=t?Te(e).replace(t,n).toString():e;a("info",r!==e?`Modified plain text content: ${r}`:"Plain text content was not modified");const o=gi(r);return a("info",`Encoded to base64: ${o}`),o}catch(t){return a("info",`Error processing base64 content: ${t.message}`),e}return t?Te(e).replace(t,n).toString():e}function y(e,t,n,r,o,i){const s=n?new wi(Be(n),"g"):null;if(t.length&&"object"==typeof e&&null!==e){const c=n?function(e,t,n,r,o){if(!t.length)return e;let i=e;for(let n=0;n<t.length-1;n++){if(!i||"object"!=typeof i)return a("info",`Cannot navigate to path: property '${t[n]}' not found`),e;i=i[t[n]]}const s=t[t.length-1];if(!i||"object"!=typeof i||!(s in i))return a("info",`Target property '${s}' not found at path`),e;const c=i[s];if("string"!=typeof c)return a("info","Property at path is not a string: "+typeof c),e;const l=h(c,n,r,o);if(l!==c){const n=JSON.parse(JSON.stringify(e));let r=n;for(let e=0;e<t.length-1;e++)r=r[t[e]];return r[s]=l,a("info",`Replaced value at path '${t.join(".")}': '${c}' -> '${l}'`),n}return e}(e,t,s,r,o):e;return c!==e&&(a("success",`Replaced outbound value\nFILTER: replace-outbound-value ${i}`),d()),c}if("string"==typeof e){n||a("info",`Original text content: ${e}`);const t=n?h(e,s,r,o):e;return t!==e&&(a("success",`Replaced outbound value: ${t} \nFILTER: replace-outbound-value ${i}`),d()),t}return e}c();const g=function(e,t){let n=e,r=Te(t).split(".");for(let e=0;e<r.length-1;e++){let t=r[e];if(!n||"object"!=typeof n&&"function"!=typeof n)return{base:n,prop:t,remainingPath:r.slice(e).join("."),success:!1};n=n[t]}return{base:n,prop:r[r.length-1],success:!0}}(window,e);if(!g.success)return a("error",`Could not reach the end of the prop chain: ${e}. Remaining path: ${g.remainingPath}`),void u();const{base:w,prop:m}=g,v=w[m];if(!v||"function"!=typeof v)return a("error",`Could not retrieve the method: ${e}`),void u();let b=[];i&&(b=Te(i).split("."));let E=[];s&&(E=Te(s).split(",").map((e=>e.trim())));let S=!1,x=l(v,(function(){if(S)return o(v,this,arguments);S=!0;const e=o(v,this,arguments);if(E.length&&!jt(E,a))return S=!1,e;if(e&&"function"==typeof e.then)return a("info","Method returned a Promise, modifying resolved value"),S=!1,e.then((e=>{const o="object"==typeof e?JSON.stringify(e):e;return a("info",`Promise resolved with value: ${o}`),y(e,b,t,n,r,i)})).catch((e=>{throw a("info",`Promise rejected: ${e.message}`),e}));const s=y(e,b,t,n,r,i);return S=!1,s}));ot(x,v),hi.defineProperty(w,m,{value:x}),a("info",`Wrapped ${e}`),u()},"replace-xhr-request":function(e,t="",n=null,r="replace"){const o=Ve(arguments),i=Ye("replace-xhr-request"),{mark:s,end:a}=De("replace-xhr-request");if(!e)throw new Ti("[replace-xhr-request]: Missing 'search' parameter");function c(e){try{return ji.parse(e)}catch(t){return e}}function l(e,t,n){let r=e[t];Oi.isArray(r)?Oi.isArray(n)?e[t]=Te(r).concat(n):Te(r).push(n):"object"!=typeof r||null===r||"object"!=typeof n||null===n||Oi.isArray(n)?e[t]="string"==typeof r?r+Te(n).toString():n:Ai.assign(r,n)}var u;if(Pi||(Pi=new Map,i("info","XMLHttpRequest proxied"),u=e=>{s();let t=e;for(const[n,{replacement:r,needle:o,formattedArgs:s,isJsonPath:a,jsonPathEngine:u,mode:f}]of Pi){if(o){if(!Be(o).test(t))continue;i("info",`'${o}' found in XHR request body`)}if(a)try{let e=ji.parse(t);const n=u.evaluate(e);Te(n).forEach((({parent:e,key:t})=>{let n=c(r);"append"===f?l(e,t,n):e[t]=n,i("success",`JSONPath [${f}] at [${t}] with `+r,"\nFILTER: replace-xhr-request "+s);const o="replace-xhr-request "+s;Ci.has(o)||(Ci.add(o),Je(o))})),t=ji.stringify(e)}catch(e){i("info","JSONPath: skipping non-JSON body or evaluation error: "+e.message)}else if(t=Te(t).replace(n,r).toString(),e.toString()!==t.toString()){i("success",`'${n}' replaced with '${r}' in XHR request body`,"\nFILTER: replace-xhr-request "+s);const e="replace-xhr-request "+s;Ci.has(e)||(Ci.add(e),Je(e))}}return a(),t},Si.push(u),Ri()),Te(e).startsWith("jsonpath(")){let s;try{const t=Te(e).slice(9,-1).toString();s=new Ar(t)}catch(t){return void i("error",`Invalid JSONPath query: ${e}. Error: ${t.message}`)}Pi.set(e,{replacement:t,needle:n,formattedArgs:o,isJsonPath:!0,jsonPathEngine:s,mode:r})}else{const i=Be(e),s=new Li(i,"g");Pi.set(s,{replacement:t,needle:n,formattedArgs:o,isJsonPath:!1,jsonPathEngine:null,mode:r})}},"replace-xhr-response":function(e,t="",n=null){const r=Ve(arguments),o=Ye("replace-xhr-response"),{mark:i,end:s}=De("replace-xhr-response");if(e)if(Mi||(Mi=new Map,o("info","XMLHttpRequest proxied"),ki((e=>{i();let t=e;for(const[n,{replacement:r,needle:i,formattedArgs:s,isJsonPath:a,jsonPathEngine:c}]of Mi){if(i){if(!Be(i).test(t)){Xe()&&(console.groupCollapsed(`DEBUG [replace-xhr-response] warn: '${i}' not found in XHR response`),o("warn",t),console.groupEnd());continue}Xe()&&(console.groupCollapsed(`DEBUG [replace-xhr-response] success: '${i}' found in XHR response`),o("info",t),console.groupEnd())}if(a)try{let e=Ni.parse(t);const n=c.evaluate(e);Te(n).forEach((({parent:e,key:t})=>{e[t]=Tt(r),o("success",`JSONPath match at [${t}], replaced with `+r,"\nFILTER: replace-xhr-response "+s);const n="replace-xhr-response "+s;Di.has(n)||(Di.add(n),Je(n))})),t=Ni.stringify(e)}catch(e){o("info","JSONPath: skipping non-JSON response or evaluation error: "+e.message)}else if(t=Te(t).replace(n,r).toString(),e.toString()!==t.toString()){const e="replace-xhr-response "+s;Di.has(e)||(Di.add(e),Je(e)),Xe()&&(console.groupCollapsed(`DEBUG [replace-xhr-response] success: '${n}' replaced with '${r}' in XHR response`,"\nFILTER: replace-xhr-response "+s),o("success",t),console.groupEnd())}}return s(),t.toString()}))),Te(e).startsWith("jsonpath(")){let i;try{const t=Te(e).slice(9,-1).toString();i=new Ar(t)}catch(t){return void o("error",`Invalid JSONPath query: ${e}. Error: ${t.message}`)}Mi.set(e,{replacement:t,needle:n,formattedArgs:r,isJsonPath:!0,jsonPathEngine:i})}else{const o=Be(e),i=new Ii(o,"g");Mi.set(i,{replacement:t,needle:n,formattedArgs:r,isJsonPath:!1,jsonPathEngine:null})}else o("error","The parameter 'pattern' is required")},"strip-fetch-query-parameter":function(e,t=null){const n=Ve(arguments),r=Ye("strip-fetch-query-parameter"),{mark:o,end:i}=De("strip-fetch-query-parameter"),s=e=>{o();for(let[t,n]of Fi.entries()){const{reg:o,args:i}=n;if((!o||o.test(e))&&qi(e.searchParams,t)){r("success",`${t} has been stripped from url ${e}`,`\nFILTER: strip-fetch-query-parameter ${i}`);const n="strip-fetch-query-parameter "+i;Hi.has(n)||(Hi.add(n),Je(n)),Wi(e.searchParams,t)}}i()};var a;Fi||(Fi=new Map,a=s,ri.push(a),ii()),Fi.set(e,{reg:t&&Be(t),args:n})},"timer-override":function(e,t="",n="",r=Gi.BOTH,i=""){if(!e)throw new Bi("[timer-override snippet]: Missing required parameter timerValue.");if(!Ji.values(Gi).includes(r))throw new Bi("[timer-override snippet]: Invalid mode. Acceptable values are: "+Ji.values(Gi).join(", "));const a=_i(e,10);if(Vi(a))throw new Bi("[timer-override snippet]: timerValue must be a number.");if(!Ki){Ki=Te([]);const u=Ye("timer-override"),{mark:f,end:p}=De("timer-override");function d(e){try{return"function"==typeof e?s(zi,e):""+e}catch(e){return""}}function h(e,t,n,r,i,s,a){const c=d(i);for(const l of Ki){if(r.indexOf(l.mode)<0)continue;if(l.needleRegex){const e=""+s;if(!l.needleRegex.test(c)&&!l.needleRegex.test(e))continue;u("info",l.needle+" found in "+c)}if(l.stackNeedles.length>0&&!jt(l.stackNeedles,u))continue;let f=i;const p=l.newDelay;l.isNoop&&(f=()=>{},u("success","Callback replaced with noop for "+c)),u("success",n+" replaced with "+p+" for "+c);const d="timer-override "+l.formattedArgs;Qi.has(d)||(Qi.add(d),Je(d));const h=Te([f,p]);for(let e=2;e<a.length;e++)h.push(a[e]);return o(t,e,h)}return null}f();const y=Te([Gi.TIMEOUT,Gi.BOTH]);let g=l(Ui,(function(e,t){const n=h(this,Ui,"setTimeout",y,e,t,arguments);return null!==n?n:o(Ui,this,arguments)}));ot(g,Ui),Ji.defineProperty(window,"setTimeout",{value:g});const w=Te([Gi.INTERVAL,Gi.BOTH]);let m=l(Xi,(function(e,t){const n=h(this,Xi,"setInterval",w,e,t,arguments);return null!==n?n:o(Xi,this,arguments)}));ot(m,Xi),Ji.defineProperty(window,"setInterval",{value:m}),u("info","timer APIs proxied"),p()}let c=[];i&&(c=i.split(/ +/)),Ki.push({newDelay:a,needle:t,needleRegex:t?Be(t):null,mode:r,isNoop:"noop"===n,stackNeedles:c,formattedArgs:Ve(arguments)})},trace:function(...e){o(Qe,null,e)},"tmp-yt-buffering-spoof":function(e,t,n,r){if(ss)return;ss=!0;const{Document:i,HTMLIFrameElement:s,Response:a}=Te(window),c=Ye("tmp-yt-buffering-spoof"),{mark:u,end:f}=De("tmp-yt-buffering-spoof");u();let p=as,d=null,h=0,y=0;const g=window.JSON.stringify,w=window.JSON.parse,m=es.getOwnPropertyDescriptor(i.prototype,"visibilityState"),v=()=>{try{es.defineProperty(rs,"visibilityState",{get:()=>"visible",configurable:!0})}catch(e){}},b=function(e){for(let t=1;t<arguments.length;t++){if(null==e)return;e=e[arguments[t]]}return e},E=function(e){const t=[],n=[];if("string"!=typeof e||0===e.length)return{allow:t,deny:n};const r=e.split(/\s+/);for(let e=0;e<r.length;e++){const o=r[e];o&&("!"===o.charAt(0)&&o.length>1?n.push(o.slice(1).toLowerCase()):t.push(o.toLowerCase()))}return{allow:t,deny:n}}("string"==typeof r&&r.replace(/\s+/g,"").length>0?r:"!homepage !shorts watch"),S=new ts;if("string"==typeof e){const t=e.split(/\s+/);for(let e=0;e<t.length;e++){const n=os(t[e],10);n>=1&&S.add(n)}}const x=e=>!S.has(e),$=(e,t,n)=>{x(e)&&function(e,t,n){try{e()}catch(e){n("error",`Failed to install ${t}: ${e}`)}}(t,n,c)},R=()=>{const e=is.location.href;return-1!==e.indexOf("/shorts/")||-1!==e.indexOf("youtube.com/tv")||-1!==e.indexOf("youtube.com/embed/")},k=()=>R()||!function(e,t){const n=function(e){if("string"!=typeof e||0===e.length)return"homepage";let t=e;const n=t.indexOf("?");-1!==n&&(t=t.slice(0,n));const r=t.indexOf("#");-1!==r&&(t=t.slice(0,r));const o=t.indexOf("://");-1!==o&&(t=t.slice(o+3));const i=t.indexOf("/");if(-1===i)return"homepage";const s=t.slice(i),a=/^\/([^/]+)/.exec(s);return a?a[1].toLowerCase():"homepage"}(e);for(let e=0;e<t.deny.length;e++)if(t.deny[e]===n)return!1;if(0===t.allow.length)return!0;for(let e=0;e<t.allow.length;e++)if(t.allow[e]===n)return!0;return!1}(is.location.href,E),P=e=>{if(!e.playbackContext&&!e.playerRequest)return;const t=b(e,"context","client","configInfo");t&&t.appInstallData&&delete t.appInstallData},O=(e,t)=>{try{if(!e||!t)return;(e=>{const t=e.videoId;"string"==typeof t&&0!==t.length&&(null!==d&&d!==t&&(c("info",`New video ${t} (was ${d}) — reset to ${as}`),p=as),d=t)})(e);let n=p;const r=(()=>{try{const e=rs.getElementById("movie_player");if(!e||"function"!=typeof e.getPlayerResponse)return null;const t=e.getPlayerResponse();return b(t,"playabilityStatus","status")}catch(e){return null}})();"LOGIN_REQUIRED"!==r&&"CONTENT_CHECK_REQUIRED"!==r||(n=ps);const o=b(e,"context","client","clientScreen"),i=()=>{t.contentPlaybackContext&&(t.contentPlaybackContext.lactMilliseconds=`${Zi.now()}`)};if(n===as&&o!==ys)return e.params=ds,e.playerRequest&&e.playerRequest.params!==ds&&(e.playerRequest.params=ds),e.playbackContext&&e.playbackContext.params!==ds&&(e.playbackContext.params=ds),i(),v(),P(e),void h++;if(n===cs&&o!==ys)return e.params!==hs&&(e.params=hs),e.playerRequest&&e.playerRequest.params!==hs&&(e.playerRequest.params=hs),e.playbackContext&&e.playbackContext.params!==hs&&(e.playbackContext.params=hs),!e.playlistId&&e.context&&e.context.client&&(e.context.client.clientScreen=ys),i(),v(),P(e),void h++;if(n===ls&&o!==ys){const n=t.params;if("string"==typeof n&&(0===n.indexOf(ds)||0===n.indexOf(hs)))return;return t.adPlaybackContext={pyv:!0},i(),P(e),void h++}if(n===us){if("WEB"!==b(e,"context","client","clientName"))return;return e.context.client.clientScreen=ys,i(),v(),P(e),void h++}if(n===fs)return t.adPlaybackContext={adType:"AD_TYPE_INSTREAM"},i(),v(),P(e),void h++;n===ps&&(t.adPlaybackContext&&delete t.adPlaybackContext,(()=>{try{m&&es.defineProperty(rs,"visibilityState",m)}catch(e){}})())}catch(e){}},T=e=>{e&&e.context&&e.context.client&&(e.playbackContext&&void 0===e.playbackContext.adPlaybackContext&&O(e,e.playbackContext),e.playerRequest&&e.playerRequest.playbackContext&&void 0===e.playerRequest.playbackContext.adPlaybackContext&&O(e,e.playerRequest.playbackContext))},j=l(g,(function(){if(R())return o(g,this,arguments);try{const e=arguments[0];e&&"object"==typeof e&&T(e)}catch(e){}return o(g,this,arguments)}));ot(j,g),$(1,(()=>{es.defineProperty(window.JSON,"stringify",{value:j,writable:!0,configurable:!0})}),"JSON.stringify");const A=l(w,(function(){if(k()||p===ps)return o(w,this,arguments);let e;try{e=o(w,this,arguments)}catch(e){return o(w,this,arguments)}try{if(!e||"object"!=typeof e)return e;if(!e.responseContext&&!e.playabilityStatus)return e;y++;const t=g(e);let n=!1;for(const e of gs)if(-1!==t.indexOf(e)){n=!0;break}const r=-1!==t.indexOf("CONTENT_CHECK_REQUIRED");if(n&&!r)return(e=>{let t;t=p===as?cs:p===cs?ls:p===ls?us:p===us?fs:ps,c("info",`State: ${p} → ${t} (${e})`),p=t})("response had error marker"),e;if(p===as){const t=b(e,"playerConfig","audioConfig");if(t&&t.muteOnStart){const n=-1!==is.location.href.indexOf("/watch"),r=b(e,"playabilityStatus","miniplayer");if(n||e.cards&&!r){delete t.muteOnStart;const n=e.messages;n&&n[0]&&n[0].youThereRenderer&&delete n[0].youThereRenderer}}}if(p===fs){const t=b(e,"playerConfig","granularVariableSpeedConfig");t&&(t.maximumPlaybackRate=200,t.minimumPlaybackRate=25)}}catch(e){}return e}));ot(A,w),$(2,(()=>{es.defineProperty(window.JSON,"parse",{value:A,writable:!0,configurable:!0})}),"JSON.parse");const L=window.TextEncoder.prototype.encode,C=l(L,(function(){if(R())return o(L,this,arguments);try{const e=arguments[0];if("string"==typeof e&&(-1!==e.indexOf('"contentPlaybackContext"')||-1!==e.indexOf('"adSignalsInfo"'))){const t=w(e);t&&t.context&&t.context.client&&(T(t),arguments[0]=g(t))}}catch(e){}return o(L,this,arguments)}));ot(C,L),$(3,(()=>{es.defineProperty(window.TextEncoder.prototype,"encode",{value:C,writable:!0,configurable:!0})}),"TextEncoder.prototype.encode");const M=new Proxy(window.Request,{construct(e,t,n){try{if(R())return Reflect.construct(e,t,n);const r=t[0],o=t[1],i="string"==typeof r?r:r&&"string"==typeof r.url?r.url:"",s=o&&o.body;if(-1!==i.indexOf("youtubei")&&"string"==typeof s&&(-1!==s.indexOf('"contentPlaybackContext"')||-1!==s.indexOf('"adSignalsInfo"'))){const e=w(s);e&&e.context&&e.context.client&&(T(e),o.body=g(e))}}catch(e){}return Reflect.construct(e,t,n)}});$(4,(()=>{es.defineProperty(window,"Request",{value:M,writable:!0,configurable:!0})}),"Request");const N=window.XMLHttpRequest.prototype.send,I=l(N,(function(){if(R())return o(N,this,arguments);try{const e=arguments[0],t=Yi.isArray(e),n=t?e[0]:e;if("string"==typeof n&&(-1!==n.indexOf('"contentPlaybackContext"')||-1!==n.indexOf('"adSignalsInfo"'))){const e=w(n);if(e&&e.context&&e.context.client){T(e);const n=g(e);t?arguments[0][0]=n:arguments[0]=n}}}catch(e){}return o(N,this,arguments)}));ot(I,N),$(5,(()=>{es.defineProperty(window.XMLHttpRequest.prototype,"send",{value:I,writable:!0,configurable:!0})}),"XMLHttpRequest.prototype.send");const D={apply(e,t,n){const r=Reflect.apply(e,t,n);try{if(r&&r.responseContext){delete r.adSlots,delete r.playerAds;const e=b(r,"playerConfig","audioConfig");if(e&&e.muteOnStart){const t=-1!==is.location.href.indexOf("/watch"),n=b(r,"playabilityStatus","miniplayer");if(t||r.cards&&!n){delete e.muteOnStart;const t=r.messages;t&&t[0]&&t[0].youThereRenderer&&delete t[0].youThereRenderer}}}}catch(e){}return r}},F={apply(e,t,n){try{const e=n[0];if(e&&"string"==typeof e.value&&-1!==e.value.indexOf("playerResponse")){let t=e.value;const r=-1!==is.location.href.indexOf("/watch"),o=-1!==t.indexOf("cards")&&-1===t.indexOf('"miniplayer"');(r||o)&&-1!==t.indexOf('"muteOnStart":true')&&(t=t.replace('"muteOnStart":true','"muteOnStart":false'),-1!==t.indexOf('"youThereRenderer":')&&(t=t.replace('"youThereRenderer":','"no_youThereRenderer":'))),t=t.replace(/"(adSlots|playerAds)":/g,'"no_ads":'),e.value=t,n[0]=e}}catch(e){}return Reflect.apply(e,t,n)}},W=window.Promise.prototype.then,q=l(W,(function(){if(k())return o(W,this,arguments);try{const e=arguments[0];if("function"==typeof e){const t=e.toString();-1!==t.indexOf("jspbResponseCtor")?arguments[0]=new Proxy(e,D):-1!==t.indexOf(".next(")&&(arguments[0]=new Proxy(e,F))}}catch(e){}return o(W,this,arguments)}));ot(q,W),$(6,(()=>{es.defineProperty(window.Promise.prototype,"then",{value:q,writable:!0,configurable:!0})}),"Promise.prototype.then");const H=window.Node.prototype.appendChild,B=l(H,(function(){const e=o(H,this,arguments);if(R())return e;try{e instanceof s&&"about:blank"===e.src&&e.contentWindow&&(e.contentWindow.fetch=is.fetch,e.contentWindow.Request=is.Request)}catch(e){}return e}));ot(B,H),$(7,(()=>{es.defineProperty(window.Node.prototype,"appendChild",{value:B,writable:!0,configurable:!0})}),"Node.prototype.appendChild");const J=["/youtubei/v1/player","/get_watch","/get_video_info"];let _=0,V=0,z=0;si(((e,t)=>{if(!x(8)||!t||"string"!=typeof t.url||k())return e;let n=!1;for(const e of J)if(-1!==t.url.indexOf(e)){n=!0;break}if(!n)return e;if("string"==typeof e.url&&0===e.url.indexOf("data:"))return z++,e;if(-1===(e.headers.get("content-type")||"").toLowerCase().indexOf("json"))return e;const r=vs(is.location.href);return e.clone().json().then((t=>{let n=!1;const o=[];if(t&&t.playabilityStatus&&o.push(t),Yi.isArray(t))for(const e of t)e&&e.playerResponse&&e.playerResponse.playabilityStatus&&o.push(e.playerResponse);for(const e of o){ws(e)&&(n=!0),ms(e,r)&&(n=!0,V++)}if(!n)return e;_++;const i=new a(g(t),{status:e.status,statusText:e.statusText,headers:e.headers});return es.defineProperties(i,{ok:{value:e.ok},redirected:{value:e.redirected},type:{value:e.type},url:{value:e.url}}),i})).catch((()=>e))})),ki(((e,t)=>{if(!x(9)||!t||"string"!=typeof t.url||k())return e;let n=!1;for(const e of J)if(-1!==t.url.indexOf(e)){n=!0;break}if(!n)return e;if(0===t.url.indexOf("data:"))return z++,e;if("string"!=typeof e||0===e.length)return e;if(-1===e.indexOf("playerResponse")&&-1===e.indexOf("playabilityStatus"))return e;const r=vs(is.location.href);try{const t=w(e);let n=!1;const o=[];if(t&&t.playabilityStatus&&o.push(t),Yi.isArray(t))for(const e of t)e&&e.playerResponse&&e.playerResponse.playabilityStatus&&o.push(e.playerResponse);for(const e of o){const t=ws(e),o=ms(e,r);t&&(n=!0),o&&(n=!0,V++)}return n?(_++,g(t)):e}catch(t){return e}}));const U=(e,t)=>{if(null==e)return t;const n=os(`${e}`,10);return n>=0?n:t},X=U(t,5e3),G=U(n,600),K=new ts,Q=new ts,Y=new ns;let Z=0,ee=0;const te=()=>{try{const e=rs.getElementById("movie_player"),t=e&&"function"==typeof e.getPlayerResponse?e.getPlayerResponse():null;return t&&t.videoDetails&&t.videoDetails.videoId||""}catch(e){return""}},ne=()=>!k(),re=e=>{let t=!1;try{const e=rs.getElementById("movie_player");e&&"function"==typeof e.unMute&&(e.unMute(),t=!0,"function"==typeof e.getVolume&&"function"==typeof e.setVolume&&0===e.getVolume()&&e.setVolume(100))}catch(e){}try{e&&e.muted&&(e.muted=!1)}catch(e){}return t},oe=()=>{if(k())return;const e=rs.querySelector("video.html5-main-video")||rs.querySelector("video.video-stream");if(!e||Y.has(e))return;Y.add(e);let t=0,n=0;e.addEventListener("playing",(()=>{try{if(t=Zi.now(),n=0,!ne())return;if(!e.muted)return;const r=te();if(r&&Q.has(r))return;if(r&&K.has(r))return;r&&K.add(r),Z++;const o=re(e);c("info",`[video.playing] muted at first playing for videoId=${r||"?"} — unmuted (via `+(o?"player.unMute()":"element")+").")}catch(e){}})),e.addEventListener("volumechange",(()=>{try{if(!ne())return;const r=te(),o=0!==ee&&Zi.now()-ee<G;if(!e.muted)return void(o&&r&&Q.delete(r));if(o)return r&&Q.add(r),void c("info",`[video.volumechange] mute within user-gesture window — remembering + respecting user mute (videoId=${r||"?"}).`);if(r&&Q.has(r))return void c("info",`[video.volumechange] mute on user-muted video — respecting (videoId=${r}).`);if(0===t)return;const i=Zi.now()-t;if(i>=X)return;if(n>=5)return;n++,Z++;const s=re(e);c("info",`[video.volumechange] late mute at +${i}ms after playing for videoId=${r||"?"} — unmuted (via `+(s?"player.unMute()":"element")+").")}catch(e){}})),c("info",`[video-watcher] attached to <video> element (late-mute window=${X}ms).`)};if(x(10)){oe();new MutationObserver((()=>{oe()})).observe(rs,{childList:!0,subtree:!0}),rs.addEventListener("yt-navigate-finish",(()=>{oe()}));const e=()=>{ee=Zi.now()};rs.addEventListener("click",(t=>{try{const n=t.target;n&&"function"==typeof n.closest&&n.closest(".ytp-mute-button")&&e()}catch(e){}}),!0),rs.addEventListener("keydown",(t=>{try{const n=t.key;if("m"!==n&&"M"!==n)return;const r=rs.activeElement,o=r&&r.tagName?r.tagName:"";if("INPUT"===o||"TEXTAREA"===o||r&&r.isContentEditable)return;e()}catch(e){}}),!0)}c("info",`Installed. Starting state: ${p}. Hooks: JSON.{stringify,parse}, TextEncoder.encode, Request, XMLHttpRequest.send, Promise.then, Node.appendChild, fetch-postFetch, xhr-postResponse, video-unmute. Counters: ${h} mutations, ${y} responses inspected, ${_} response-rewrites, ${V} startSeconds-injects, ${z} honeypot bypasses, ${Z} video-element unmutes. Windows: late-mute=${X}ms, user-gesture=${G}ms.`+(S.size>0?` Disabled hooks: ${[...S].join(",")}.`:"")+function(e){if(0===e.allow.length&&0===e.deny.length)return"";const t=[];e.allow.length>0&&t.push("allow=["+e.allow.join(",")+"]");e.deny.length>0&&t.push("deny=["+e.deny.join(",")+"]");return" Path filter: "+t.join(" ")+"."}(E)),f()},"tmp-yt-force-reload":function(e,t,n,r){if(Ps)return;Ps=!0;const o=Ye("tmp-yt-force-reload"),{mark:i,end:s}=De("tmp-yt-force-reload");i();const a=(()=>{const e="string"==typeof n?n.toString():"0",t=$s(e,10);return isNaN(t)||t<0?0:t})(),c="every"===("string"==typeof e?e.toString():"").toLowerCase()?"every":"first",l=(()=>{const e=("string"==typeof t?t.toString():"").toLowerCase();return"dom"===e||"player"===e||"both"===e?e:"none"})(),u=function(e){const t=[],n=[];if("string"!=typeof e||0===e.length)return{allow:t,deny:n};const r=e.split(/\s+/);for(let e=0;e<r.length;e++){const o=r[e];o&&("!"===o.charAt(0)&&o.length>1?n.push(o.slice(1).toLowerCase()):t.push(o.toLowerCase()))}return{allow:t,deny:n}}(r),f=bs.now();let p="",d=0,h=!1;const y=new Ss;let g=!1,w=0;const m=()=>{if("none"===l)return;if(-1===ks.location.href.indexOf("/watch?"))return;if(!Ts(ks.location.href,u))return;const e=xs.getElementById("movie_player");if(!e||"function"!=typeof e.loadVideoById)return;if(!(e=>{if("none"===l||!e)return!1;let t=!1,n=!1;if("dom"===l||"both"===l)try{t=e.classList.contains("ytp-error")||null!==e.querySelector(".ytp-error")}catch(e){}if("player"===l||"both"===l)try{const t="function"==typeof e.getPlayerResponse?e.getPlayerResponse():null,r=t&&t.playabilityStatus&&t.playabilityStatus.status;n="string"==typeof r&&"OK"!==r&&"OK_LIMITED"!==r}catch(e){}return"both"===l?t&&n:"player"===l?n:t})(e))return;let t;try{t="function"==typeof e.getPlayerResponse?e.getPlayerResponse():null}catch(e){t=null}const n=t&&t.videoDetails&&t.videoDetails.videoId;if("string"!=typeof n||""===n)return;if(y.has(n))return;y.add(n);const r=t.playerConfig&&t.playerConfig.playbackStartConfig&&t.playerConfig.playbackStartConfig.startSeconds||0;w++;const i=w,s=bs.now()-f,a=t&&t.playabilityStatus&&t.playabilityStatus.status;o("info",`error#${i} [+${s}ms] Error detected for "${n}" (signal=${l}, playabilityStatus=${a}). Firing loadVideoById("${n}", ${r}).`);try{e.loadVideoById(n,r)}catch(e){o("error",`error#${i} loadVideoById threw: ${e}`)}},v=()=>{if(h)return!0;if(-1===ks.location.href.indexOf("/watch?"))return!1;if(!Ts(ks.location.href,u))return!1;const e=xs.getElementById("movie_player");if(!e||"function"!=typeof e.loadVideoById)return!1;let t;(e=>{if("none"===l)return;if(g||!e)return;g=!0,new Es((()=>{m()})).observe(e,{attributes:!0,attributeFilter:["class"],childList:!0,subtree:!0}),o("info",`Error arm attached to movie_player (signal=${l}).`),m()})(e);try{t="function"==typeof e.getPlayerResponse?e.getPlayerResponse():null}catch(e){t=null}const n=t&&t.videoDetails&&t.videoDetails.videoId;if("string"!=typeof n||""===n)return!1;if(n===p)return!1;const r=Os(e,"getPlayerState"),i=Os(e,"getCurrentTime"),s=Os(e,"getVideoLoadedFraction"),y=Os(e,"getDuration"),w=Os(e,"getPlayerStateObject"),v=`state=${r}, current=${i}, loadedFraction=${s}, duration=${y}, isBuffering=${w&&w.isBuffering}`;let b,E;if(1===r||2===r||0===r?(b=!1,E="already playing/paused/ended"):3===r&&"number"==typeof i&&i>=1&&("number"==typeof s&&s>=.05)?(b=!1,E="mid-playback buffer"):(b=!0,E="fresh / pre-playback"),!b)return p=n,o("info",`Skipping reload for "${n}": ${E}. ${v}`),!0;const S=t.playerConfig&&t.playerConfig.playbackStartConfig&&t.playerConfig.playbackStartConfig.startSeconds||0;p=n,d++;const x=d,$=n,R=S,k=()=>{try{const t=bs.now()-f;o("info",`#${x} [+${t}ms] Firing loadVideoById("${$}", ${R}). ${v}`),e.loadVideoById($,R)}catch(e){o("error",`#${x} loadVideoById threw: ${e}`)}};return a>0?Rs(k,a):k(),"first"===c&&(h=!0,o("info","first-mode: disabling further reloads after this fire.")),!0},b=()=>{if(v())return;let e=new Es((()=>{v()&&e&&(e.disconnect(),e=null)}));e.observe(xs,{childList:!0,subtree:!0}),Rs((()=>{e&&(e.disconnect(),e=null)}),1e4)};"loading"===xs.readyState?xs.addEventListener("DOMContentLoaded",b):b(),xs.addEventListener("yt-navigate-finish",(()=>{let e=30;const t=()=>{v()||(e--,e<=0||Rs(t,100))};Rs(t,100)})),o("info","Installed. Mode="+c+". "+("first"===c?"Fires once on the first video, then disables.":"Fires on every new video (cold load + SPA nav).")+(a>0?` +${a}ms delay.`:"")+("none"===l?" Error arm disabled.":` Error arm via ${l} signal (1 reload/video).`)+function(e){if(0===e.allow.length&&0===e.deny.length)return"";const t=[];e.allow.length>0&&t.push("allow=["+e.allow.join(",")+"]");e.deny.length>0&&t.push("deny=["+e.deny.join(",")+"]");return" Path filter: "+t.join(" ")+"."}(u)),s()}};
const snippets=js;
let context;
for (const [name, ...args] of filters) {
if (snippets.hasOwnProperty(name)) {
try { context = snippets[name].apply(context, args); }
catch (error) { console.error(error); }
}
}
context = void 0;
};
const graph = new Map([["abort-current-inline-script",null],["abort-on-iframe-property-read",null],["abort-on-iframe-property-write",null],["abort-on-property-read",null],["abort-on-property-write",null],["array-override",null],["blob-override",null],["cookie-remover",null],["debug",null],["event-override",null],["freeze-element",null],["hide-if-canvas-contains",null],["hide-if-shadow-contains",null],["json-override",null],["json-prune",null],["map-override",null],["override-property-read",null],["prevent-element-src-loading",null],["prevent-listener",null],["prevent-window-open",null],["profile",null],["replace-argument",null],["replace-fetch-response",null],["replace-outbound-value",null],["replace-xhr-request",null],["replace-xhr-response",null],["strip-fetch-query-parameter",null],["timer-override",null],["trace",null],["tmp-yt-buffering-spoof",null],["tmp-yt-force-reload",null]]);
callback.get = snippet => graph.get(snippet);
callback.has = snippet => graph.has(snippet);
callback.getGraph = () => graph;
callback.setEnvironment = env => {
  if (typeof currentEnvironment !== "undefined")
    currentEnvironment = env;
};
callback.setDebugStyle = styles => {
  if (typeof currentEnvironment !== "undefined")
  {
    delete currentEnvironment.initial;
    currentEnvironment.debugCSSProperties = styles;
  }
    
};
callback.getEnvironment = () => currentEnvironment;
/* harmony default export */ const main = (callback);
;// ./src/content/shared/constants.js
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Prefix that should be used for storage and synchronization to avoid conflicts
 * when multiple extensions are installed in the same session.
 *
 * !!! IMPORTANT - DO NOT CHANGE THIS VALUE !!!
 * This exact string "ab" is hardcoded in the build
 * configurations and is replaced during the build process with host-specific
 * values (e.g., "ab" for Adblock, "abp" for Adblock Plus).
 *
 * If you change this value, the build process will NOT replace it, and the
 * extension will fail to work properly due to namespace conflicts.
 *
 * Build configuration references:
 * - host/adblock/build/config/base.mjs (replacements.search)
 * - host/adblockplus/build/webext/config/base.mjs (replacements.search)
 *
 * @type {string}
 */
const HOST_PREFIX_TO_REPLACE = "ab";

/**
 * Dataset key used to exchange the communication channel name between content
 * scripts in different contexts (main world and isolated world)
 * @type {string}
 */
const COMMS_CHANNEL_DATASET_KEY = `${HOST_PREFIX_TO_REPLACE}FiltersChannel`;

/**
 * Event used to communicate between content script contexts
 * @type {string}
 */
const HANDSHAKE_EVENT_NAME = `${HOST_PREFIX_TO_REPLACE}-handshake`;

/**
 * Storage key used to cache the filters config in content scripts
 * @type {string}
 */
const CACHED_FILTERS_CONFIG_KEY = `${HOST_PREFIX_TO_REPLACE}-filters-config`;

;// ./src/all/snippets.js
/**
 * CSS properties applied to elements hidden in debug mode
 * @type {string[][]}
 */
const DEBUG_CSS_PROPERTIES = [
    ["background", "repeating-linear-gradient(to bottom, #e67370 0, #e67370 9px, white 9px, white 10px)"],
    ["outline", "solid red"]
  ];
  
;// ./src/content/main/shims/storage.js
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */

/* eslint-disable no-extend-native */

function shimStorage(CACHED_FILTERS_CONFIG_KEY) {
  // =================== Secured copies of native functions ====================
  // These are captured before page scripts run.
  // Used inside Proxy apply handlers which run after page scripts.
  const {parse: $JSONparse, stringify: $JSONstringify} = JSON;
  const {keys: $ObjectKeys} = Object;
  const {
    apply: $ReflectApply,
    ownKeys: $ReflectOwnKeys,
    get: $ReflectGet,
    set: $ReflectSet,
    has: $ReflectHas,
    getOwnPropertyDescriptor: $ReflectGetOwnPropertyDescriptor,
    defineProperty: $ReflectDefineProperty,
    deleteProperty: $ReflectDeleteProperty
  } = Reflect;
  const {filter: $ArrayFilter} = Array.prototype;
  const {get: $MapGet, set: $MapSet, has: $MapHas} = Map.prototype;
  const $String = String;

  // Helpers using secured copies
  const filter = (arr, fn) => $ReflectApply($ArrayFilter, arr, [fn]);
  const mapGet = (map, key) => $ReflectApply($MapGet, map, [key]);
  const mapSet = (map, key, val) => $ReflectApply($MapSet, map, [key, val]);
  const mapHas = (map, key) => $ReflectApply($MapHas, map, [key]);

  // Need to unwrap our own proxies when multiple extensions run this shim.
  const realLocalStorage = window.localStorage;
  const realSessionStorage = window.sessionStorage;
  let localStorageProxy;
  let sessionStorageProxy;
  function unwrapStorage(storage) {
    if (storage === localStorageProxy) {
      return realLocalStorage;
    }
    if (storage === sessionStorageProxy) {
      return realSessionStorage;
    }
    return storage;
  }

  const originalToStrings = new Map();

  const storageGetItemDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "getItem"
  );
  const originalStorageGetItem = storageGetItemDesc.value;

  // =================== Conditional application of the shim ===================
  function shouldShimStorage() {
    const config = getConfig(window.sessionStorage) ||
      getConfig(window.localStorage);
    return Boolean(config);
  }

  if (!shouldShimStorage()) {
    return;
  }

  // ===================== Storage.prototype.getItem ======================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem
  function getConfig(storage) {
    try {
      const configSerialized = $ReflectApply(
        originalStorageGetItem, unwrapStorage(storage),
        [CACHED_FILTERS_CONFIG_KEY]
      );
      if (configSerialized) {
        return $JSONparse(configSerialized);
      }
    }
    catch (e) {
      // If we can't parse, return null
    }
    return null;
  }

  function websiteHasValue(config) {
    return config && typeof config.websiteValue === "string";
  }
  const storageGetItemProxy = new Proxy(originalStorageGetItem, {
    apply(target, thisArg, argumentsList) {
      const key = argumentsList[0];
      const unwrappedThis = unwrapStorage(thisArg);
      if (key === CACHED_FILTERS_CONFIG_KEY) {
        const config = getConfig(unwrappedThis);
        if (websiteHasValue(config)) {
          return config.websiteValue;
        }
        return null;
      }
      return $ReflectApply(target, unwrappedThis, argumentsList);
    }
  });
  Object.defineProperty(Storage.prototype, "getItem", {
    ...storageGetItemDesc,
    value: storageGetItemProxy
  });
  mapSet(
    originalToStrings,
    storageGetItemProxy,
    originalStorageGetItem.toString.bind(originalStorageGetItem)
  );

  // ===================== Storage.prototype.setItem ===========================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
  const storageSetItemDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "setItem"
  );
  const originalStorageSetItem = storageSetItemDesc.value;
  const storageSetItemProxy = new Proxy(originalStorageSetItem, {
    apply(target, thisArg, argumentsList) {
      const key = argumentsList[0];
      const unwrappedThis = unwrapStorage(thisArg);
      if (key === CACHED_FILTERS_CONFIG_KEY) {
        const config = getConfig(unwrappedThis) || {};
        config.websiteValue = $String(argumentsList[1]);
        $ReflectApply(
          target,
          unwrappedThis,
          [CACHED_FILTERS_CONFIG_KEY, $JSONstringify(config)]
        );
        return void 0;
      }
      return $ReflectApply(target, unwrappedThis, argumentsList);
    }
  });
  Object.defineProperty(Storage.prototype, "setItem", {
    ...storageSetItemDesc,
    value: storageSetItemProxy
  });
  mapSet(
    originalToStrings,
    storageSetItemProxy,
    originalStorageSetItem.toString.bind(originalStorageSetItem)
  );

  // ================== Storage.prototype.removeItem ==========================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/removeItem
  const storageRemoveItemDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "removeItem"
  );
  const originalStorageRemoveItem = storageRemoveItemDesc.value;
  const storageRemoveItemProxy = new Proxy(originalStorageRemoveItem, {
    apply(target, thisArg, argumentsList) {
      const key = argumentsList[0];
      const unwrappedThis = unwrapStorage(thisArg);
      if (key === CACHED_FILTERS_CONFIG_KEY) {
        const config = getConfig(unwrappedThis);
        if (websiteHasValue(config)) {
          delete config.websiteValue;
          $ReflectApply(
            originalStorageSetItem,
            unwrappedThis, [CACHED_FILTERS_CONFIG_KEY, $JSONstringify(config)]
          );
        }
        return void 0;
      }
      return $ReflectApply(target, unwrappedThis, argumentsList);
    }
  });
  Object.defineProperty(Storage.prototype, "removeItem", {
    ...storageRemoveItemDesc,
    value: storageRemoveItemProxy
  });
  mapSet(
    originalToStrings,
    storageRemoveItemProxy,
    originalStorageRemoveItem.toString.bind(originalStorageRemoveItem)
  );

  // ==================== Storage.prototype.clear ============================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/clear
  const storageClearDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "clear"
  );
  const originalStorageClear = storageClearDesc.value;
  const storageClearProxy = new Proxy(originalStorageClear, {
    apply(target, thisArg, argumentsList) {
      const unwrappedThis = unwrapStorage(thisArg);
      const config = getConfig(unwrappedThis);
      if (config) {
        delete config.websiteValue;
      }

      $ReflectApply(target, unwrappedThis, argumentsList);

      // Restore our config (without websiteValue)
      if (config && $ObjectKeys(config).length > 0) {
        $ReflectApply(
          originalStorageSetItem,
          unwrappedThis, [CACHED_FILTERS_CONFIG_KEY, $JSONstringify(config)]
        );
      }
      return void 0;
    }
  });
  Object.defineProperty(Storage.prototype, "clear", {
    ...storageClearDesc,
    value: storageClearProxy
  });
  mapSet(
    originalToStrings,
    storageClearProxy,
    originalStorageClear.toString.bind(originalStorageClear)
  );

  // ===================== Storage.prototype.key ===============================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/key
  const storageKeyDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "key"
  );
  const originalStorageKey = storageKeyDesc.value;
  const storageKeyProxy = new Proxy(originalStorageKey, {
    apply(target, thisArg, argumentsList) {
      const unwrappedThis = unwrapStorage(thisArg);
      const config = getConfig(unwrappedThis);
      if (!config || websiteHasValue(config)) {
        return $ReflectApply(target, unwrappedThis, argumentsList);
      }

      const requestedIndex = argumentsList[0];
      for (let i = 0; i <= requestedIndex; i++) {
        const key = $ReflectApply(target, unwrappedThis, [i]);
        if (key === CACHED_FILTERS_CONFIG_KEY) {
          return $ReflectApply(target, unwrappedThis, [requestedIndex + 1]);
        }
      }
      return $ReflectApply(target, unwrappedThis, argumentsList);
    }
  });
  Object.defineProperty(Storage.prototype, "key", {
    ...storageKeyDesc,
    value: storageKeyProxy
  });
  mapSet(
    originalToStrings,
    storageKeyProxy,
    originalStorageKey.toString.bind(originalStorageKey)
  );

  // =================== Storage.prototype.length ============================
  // @docs https://developer.mozilla.org/en-US/docs/Web/API/Storage/length
  const storageLengthDesc = Object.getOwnPropertyDescriptor(
    Storage.prototype, "length"
  );
  const originalStorageLengthGetter = storageLengthDesc.get;
  Object.defineProperty(Storage.prototype, "length", {
    ...storageLengthDesc,
    get() {
      const unwrappedThis = unwrapStorage(this);
      const originalLength =
        $ReflectApply(originalStorageLengthGetter, unwrappedThis, []);
      const config = getConfig(unwrappedThis);
      if (config && !websiteHasValue(config)) {
        return originalLength - 1;
      }
      return originalLength;
    }
  });

  // ================== Proxy wrapper for localStorage ===========
  // Handles: {...localStorage}, Object.keys(), Object.values(), for...in, etc.
  const methodProxyCache = new Map();

  function getMethodProxy(method) {
    if (mapHas(methodProxyCache, method)) {
      return mapGet(methodProxyCache, method);
    }
    const methodProxy = new Proxy(method, {
      apply(fn, thisArg, args) {
        return $ReflectApply(fn, thisArg, args);
      }
    });
    mapSet(methodProxyCache, method, methodProxy);
    // Register toString for the wrapper to preserve function name
    const originalMethod = mapGet(originalToStrings, method);
    if (originalMethod) {
      mapSet(originalToStrings, methodProxy, originalMethod);
    }
    return methodProxy;
  }

  const storageInstanceProxyConfig = {
    ownKeys(target) {
      const keys = $ReflectOwnKeys(target);
      const config = getConfig(target);
      if (config && !websiteHasValue(config)) {
        return filter(keys, key => key !== CACHED_FILTERS_CONFIG_KEY);
      }
      return keys;
    },

    // Required for spread operator
    getOwnPropertyDescriptor(target, prop) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        const config = getConfig(target);
        if (config && !websiteHasValue(config)) {
          return void 0; // Hide the property entirely
        }
        // When website has set a value, return a proper enumerable descriptor
        // with the website's value (not our internal config)
        if (websiteHasValue(config)) {
          return {
            value: config.websiteValue,
            writable: true,
            enumerable: true,
            configurable: true
          };
        }
      }
      return $ReflectGetOwnPropertyDescriptor(target, prop);
    },

    // Needed for 'in' operator
    has(target, prop) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        const config = getConfig(target);
        if (config && !websiteHasValue(config)) {
          return false;
        }
      }
      return $ReflectHas(target, prop);
    },

    // Forward get/set using original target so native methods work correctly
    get(target, prop) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        return target.getItem(CACHED_FILTERS_CONFIG_KEY);
      }
      // Return correct toStringTag so Object.prototype.toString returns
      // [object Storage] instead of [object Object] (for older Firefox)
      if (prop === Symbol.toStringTag) {
        return "Storage";
      }
      const value = $ReflectGet(target, prop, target);
      // For methods, wrap in a proxy to bind `this` to original target
      // while preserving toString behavior
      if (typeof value === "function") {
        return getMethodProxy(value);
      }
      return value;
    },

    set(target, prop, value) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        target.setItem(CACHED_FILTERS_CONFIG_KEY, value);
        return true;
      }
      return $ReflectSet(target, prop, value, target);
    },

    defineProperty(target, prop, descriptor) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        if ("value" in descriptor) {
          target.setItem(CACHED_FILTERS_CONFIG_KEY, descriptor.value);
        }
        return true;
      }
      return $ReflectDefineProperty(target, prop, descriptor);
    },

    deleteProperty(target, prop) {
      if (prop === CACHED_FILTERS_CONFIG_KEY) {
        target.removeItem(CACHED_FILTERS_CONFIG_KEY);
        return true;
      }
      return $ReflectDeleteProperty(target, prop);
    }
  };

  localStorageProxy = new Proxy(
    window.localStorage,
    storageInstanceProxyConfig
  );

  sessionStorageProxy = new Proxy(
    window.sessionStorage,
    storageInstanceProxyConfig
  );

  // Capture the native accessor getters before redefining.
  const localStorageDesc =
    Object.getOwnPropertyDescriptor(window, "localStorage");
  const sessionStorageDesc =
    Object.getOwnPropertyDescriptor(window, "sessionStorage");
  const nativeLocalStorageGetter = localStorageDesc && localStorageDesc.get;
  const nativeSessionStorageGetter =
    sessionStorageDesc && sessionStorageDesc.get;

  function localStorageGetter() {
    return localStorageProxy;
  }
  function sessionStorageGetter() {
    return sessionStorageProxy;
  }

  if (nativeLocalStorageGetter) {
    $ReflectDefineProperty(localStorageGetter, "name", {
      value: nativeLocalStorageGetter.name,
      configurable: true
    });
    mapSet(
      originalToStrings,
      localStorageGetter,
      nativeLocalStorageGetter.toString.bind(nativeLocalStorageGetter)
    );
  }
  if (nativeSessionStorageGetter) {
    $ReflectDefineProperty(sessionStorageGetter, "name", {
      value: nativeSessionStorageGetter.name,
      configurable: true
    });
    mapSet(
      originalToStrings,
      sessionStorageGetter,
      nativeSessionStorageGetter.toString.bind(nativeSessionStorageGetter)
    );
  }

  Object.defineProperty(window, "localStorage", {
    get: localStorageGetter,
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(window, "sessionStorage", {
    get: sessionStorageGetter,
    configurable: true,
    enumerable: true
  });

  // ===================== Function.prototype.toString =========================
  // @docs https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString
  const functionToStringDesc = Object.getOwnPropertyDescriptor(
    Function.prototype, "toString"
  );
  const originalFunctionToString = functionToStringDesc.value;
  const functionToStringProxy = new Proxy(originalFunctionToString, {
    apply(target, thisArg, argumentsList) {
      // Call "super" first, just in case the function was overwritten and had
      // checks if it was called
      const r = $ReflectApply(target, thisArg, argumentsList);

      const restoredToString = mapGet(originalToStrings, thisArg);
      if (restoredToString) {
        return $ReflectApply(restoredToString, thisArg, argumentsList);
      }

      return r;
    }
  });
  Object.defineProperty(Function.prototype, "toString", {
    ...functionToStringDesc,
    value: functionToStringProxy
  });
  mapSet(
    originalToStrings,
    functionToStringProxy,
    originalFunctionToString.toString.bind(originalFunctionToString)
  );
}

;// ./src/content/shared/helpers.js
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */



/**
 * Claims a communication channel name from the document's dataset.
 *
 * If a channel name already exists in the dataset, it is consumed (removed
 * from the dataset and returned). If no channel name exists, the fallback
 * channel is stored in the dataset and returned.
 *
 * This mechanism ensures that only one content script can claim the
 * channel name at a time, preventing conflicts when the main world
 * and isolated world scripts execution order is not consistent.
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/139#changes_for_add-on_developers
 * @see https://bugzil.la/1792685
 * @see https://eyeo.atlassian.net/wiki/spaces/B2C/pages/1666678786/Content-script+based+snippets
 *
 * @param {string} fallbackChannel - The channel name to use and store if
 *   none is present.
 * @returns {string} The claimed channel name (either the existing one
 *   or the fallback).
 */
function claimCommsChannel(fallbackChannel) {
  let channelName = document.documentElement.dataset[COMMS_CHANNEL_DATASET_KEY];

  if (!channelName) {
    channelName = fallbackChannel;
    document.documentElement.dataset[COMMS_CHANNEL_DATASET_KEY] = channelName;
  }
  else {
    delete document.documentElement.dataset[COMMS_CHANNEL_DATASET_KEY];
  }

  return channelName;
}

;// ./src/all/errors.js
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */

const ERROR_NO_CONNECTION = (/* unused pure expression or super */ null && ("Could not establish connection. " +
      "Receiving end does not exist."));
const ERROR_CLOSED_CONNECTION = (/* unused pure expression or super */ null && ("A listener indicated an asynchronous " +
      "response by returning true, but the message channel closed before a " +
      "response was received"));
// https://bugzilla.mozilla.org/show_bug.cgi?id=1578697
const ERROR_MANAGER_DISCONNECTED = "Message manager disconnected";

/**
 * Reconstructs an error from a serializable error object
 *
 * @param {Object} errorData - Error object
 *
 * @returns {Error} error
 */
function fromSerializableError(errorData) {
  const error = new Error(errorData.message);
  error.cause = errorData.cause;
  error.name = errorData.name;
  error.stack = errorData.stack;

  return error;
}

/**
 * Filters out `browser.runtime.sendMessage` errors to do with the receiving end
 * no longer existing.
 *
 * @param {Promise} promise The promise that should have "no connection" errors
 *   ignored. Generally this would be the promise returned by
 *   `browser.runtime.sendMessage`.
 * @return {Promise} The same promise, but will resolve with `undefined` instead
 *   of rejecting if the receiving end no longer exists.
 */
function ignoreNoConnectionError(promise) {
  return promise.catch(error => {
    if (typeof error == "object" &&
        (error.message == ERROR_NO_CONNECTION ||
         error.message == ERROR_CLOSED_CONNECTION ||
         error.message == ERROR_MANAGER_DISCONNECTED)) {
      return;
    }

    throw error;
  });
}

/**
 * Creates serializable error object from given error
 *
 * @param {Error} error - Error
 *
 * @returns {Object} serializable error object
 */
function toSerializableError(error) {
  return {
    cause: error.cause instanceof Error ?
      toSerializableError(error.cause) :
      error.cause,
    message: error.message,
    name: error.name,
    stack: error.stack
  };
}

;// ./src/content/main/snippets.entry.js
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */









// Use chrome.storage to detect if we're in an isolated world.
// Note: chrome.runtime is unreliable since other extensions may expose it
// in the main world.
const isMainWorld = !(
  (typeof chrome === "object" && !!chrome.storage) ||
  (typeof browser === "object" && !!browser.storage)
);

const nativeDispatch = document.dispatchEvent.bind(document);

// Get or create a unique channel name for communicating with the isolated world
const commsChannelName = claimCommsChannel(esm_browser_v4());

// Creates a sendSnippetHitEvent function that dispatches hit events back to
// the isolated world via the comms channel. The isolated-world listener
// receives, validates, and forwards the event to the telemetry pipeline.
const createMainWorldHitEventSender = (commsChannel, dispatch) => {
  const dispatchFn = dispatch || document.dispatchEvent.bind(document);
  return function sendSnippetHitEvent(filter, domain) {
    try {
      dispatchFn(new CustomEvent(commsChannel, {
        detail: {
          type: "ewe:snippet-hit",
          filter,
          domain
        }
      }));
    }
    catch (e) {
      // telemetry must never break snippet execution
    }
  };
};

const runStorageShim = (shimFn, configKey) => {
  try {
    if (typeof shimFn === "function" && configKey) {
      shimFn(configKey);
    }
  }
  catch (err) {
    // It would be good to report this error to Sentry, but we don't currently
    // have a way to do that from the main world.
  }
};

const runSnippets = snippetsConfig => {
  const {callback, filters, env, commsChannel, serializeError,
    dispatchFn} = snippetsConfig;

  if (filters.length) {
    try {
      callback(env, ...filters);
    }
    catch (e) {
      // It would be good to report this error to Sentry, but we don't currently
      // have a way to do that from the main world.
      const errorEvent = new CustomEvent(commsChannel, {
        detail: {
          type: "ewe:main-error",
          error: serializeError(e)
        }
      });
      dispatchFn(errorEvent);
    }
  }
};

const createTrustedScriptPolicy = () => {
  const isTrustedTypesSupported = typeof trustedTypes !== "undefined";
  let policy = null;

  try {
    if (isTrustedTypesSupported) {
      policy = trustedTypes.createPolicy(esm_browser_v4(), {
        createScript: code => code,
        createScriptURL: url => url
      });
    }
  }
  catch (_) {
  }
  return policy;
};

const injectScript = (executable, policy) => {
  const script = document.createElement("script");
  script.type = "application/javascript";
  script.async = false;

  if (policy) {
    script.textContent = policy.createScript(executable);
  }
  else {
    script.textContent = executable;
  }

  try {
    document.documentElement.appendChild(script);
  }
  catch (_) {}
  document.documentElement.removeChild(script);
};

const appendSnippets = snippetsConfig => {
  const policy = createTrustedScriptPolicy();
  const {
    callback,
    filters,
    env,
    shimFn,
    shimConfigKey,
    commsChannel,
    serializeError
  } = snippetsConfig;

  const snippetsCode = filters.length ? `
    const callback = (${callback});
    const runSnippets = (${runSnippets});
    const serializeError = (${serializeError});
    const createHitSender = (${createMainWorldHitEventSender});
    const env = ${JSON.stringify(env)};
    env.sendSnippetHitEvent = createHitSender(
      "${commsChannel}", null
    );
    const snippetsConfig = {
      callback,
      env,
      filters: ${JSON.stringify(filters)},
      commsChannel: "${commsChannel}",
      serializeError,
      dispatchFn: document.dispatchEvent.bind(document)
    };
    runSnippets(snippetsConfig);
  ` : "";

  const code = `(function () {
    const shimFn = (${shimFn});
    const shimConfigKey = "${shimConfigKey}";
    const runStorageShim = (${runStorageShim});
    runStorageShim(shimFn, shimConfigKey);
    ${snippetsCode}
  })();`;

  injectScript(code, policy);
};

const onFiltersReceived = event => {
  if (!event || !event.detail) {
    return;
  }

  const {type, filters, debug} = event.detail;

  // ignore other events that are not related to filters config
  if (type !== "ewe:filters-config") {
    return;
  }

  // Check which snippets need to be executed in the main world.
  const mainSnippets = [];
  for (const filter of filters) {
    for (const [name, ...args] of filter) {
      if (main.has(name)) {
        mainSnippets.push([name, ...args]);
      }
    }
  }

  // sendDetectionEvent is intentionally not included in the main world env.
  // Detection events rely on ServerLogger and Sentry, which require extension
  // API access only available in the isolated world. See snippet-events.js.
  const snippetsConfig = {
    callback: main,
    env: {
      debugCSSProperties: debug ? DEBUG_CSS_PROPERTIES : null,
      sendSnippetHitEvent: createMainWorldHitEventSender(
        commsChannelName, isMainWorld ? nativeDispatch : null
      )
    },
    filters: mainSnippets,
    shimFn: shimStorage,
    shimConfigKey: CACHED_FILTERS_CONFIG_KEY,
    commsChannel: commsChannelName,
    serializeError: toSerializableError,
    dispatchFn: nativeDispatch
  };

  // If this script is injected into the main world we can execute directly.
  // If we are on isolated world (MV2), we need to create an inline script to
  // inject the snippets into page context.
  if (isMainWorld) {
    runStorageShim(shimStorage, CACHED_FILTERS_CONFIG_KEY);
    runSnippets(snippetsConfig);
  }
  else {
    appendSnippets(snippetsConfig);
  }
};

document.addEventListener(commsChannelName, onFiltersReceived);
document.dispatchEvent(new CustomEvent(HANDSHAKE_EVENT_NAME));

/******/ })()
;
