// Molly Colour Sort — rules + solver (shared by game and build tools). Original code.
(function(root){
  const CAP=4;
  // state: {t:[ 'rrgb', ... ] (bottom->top), side:[bool], claim:[null|'r']}
  function clone(s){return {t:s.t.slice(),side:s.side.slice(),claim:s.claim.slice()};}
  function topRun(str){if(!str)return 0;const c=str[str.length-1];let n=0;for(let i=str.length-1;i>=0&&str[i]===c;i--)n++;return n;}
  function canPour(s,a,b){
    if(a===b)return 0;const A=s.t[a],B=s.t[b];if(!A.length||B.length>=CAP)return 0;
    const c=A[A.length-1];
    if(s.side[b]&&s.claim[b]&&s.claim[b]!==c)return 0;
    if(B.length&&B[B.length-1]!==c)return 0;
    return Math.min(topRun(A),CAP-B.length);
  }
  function pour(s,a,b){const n=canPour(s,a,b);if(!n)return null;const r=clone(s);const c=s.t[a].slice(-1);
    r.t[a]=s.t[a].slice(0,-n);r.t[b]=s.t[b]+c.repeat(n);if(r.side[b]&&!r.claim[b])r.claim[b]=c;return r;}
  function solved(s){return s.t.every(x=>!x.length||(x.length===CAP&&/^(.)\1*$/.test(x)));}
  function key(s){const inner=[],side=[];s.t.forEach((x,i)=>(s.side[i]?side.push((s.claim[i]||'_')+x):inner.push(x)));return inner.sort().join(',')+'|'+side.sort().join(',');}
  function useless(s,a,b,n){const A=s.t[a],B=s.t[b];
    if(!B.length&&n===A.length&&!s.side[b]&&!s.side[a])return true; // whole tube into empty inner tube
    if(!B.length&&s.side[a]&&s.side[b])return true;
    if(/^(.)\1*$/.test(A)&&A.length===CAP)return true; // never break a finished tube
    return false;}
  function solve(start,limit){limit=limit||300000;const seen=new Set();let nodes=0;const path=[];
    function dfs(s){if(solved(s))return true;if(++nodes>limit)return false;const k=key(s);if(seen.has(k))return false;seen.add(k);
      const moves=[];for(let a=0;a<s.t.length;a++)for(let b=0;b<s.t.length;b++){const n=canPour(s,a,b);if(!n||useless(s,a,b,n))continue;
        const B=s.t[b];let sc=0;if(B.length)sc+=10+B.length;if(n===topRun(s.t[a])&&s.t[a].length>n)sc+=3;if(s.side[b])sc+=1;if(!B.length)sc-=2;moves.push([sc,a,b]);}
      moves.sort((x,y)=>y[0]-x[0]);
      for(const[,a,b] of moves){path.push([a,b]);if(dfs(pour(s,a,b)))return true;path.pop();if(nodes>limit)return false;}
      return false;}
    const ok=dfs(start);return ok?path.slice():null;}
  function fromLevel(L){const t=L.c.slice(),side=t.map(()=>false),claim=t.map(()=>null);t.push('','');side.push(true,true);claim.push(null,null);return{t,side,claim};}
  const api={CAP,canPour,pour,solved,solve,fromLevel,clone,topRun};
  if(typeof module!=='undefined')module.exports=api;else root.Rules=api;
})(this);
