(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var S=256,STEP=4,THICK=2;
  function rnd(x,y){var n=Math.sin(x*91.3+y*757.2)*9301;return n-Math.floor(n);}
  var oc=document.createElement('canvas');oc.width=S;oc.height=S;
  var ox=oc.getContext('2d'),img=ox.createImageData(S,S),d=img.data;
  for(var y=0;y<S;y++){for(var x=0;x<S;x++){
    var i=(y*S+x)*4,tcx=Math.floor(x/STEP),tcy=Math.floor(y/STEP);
    var onH=(y%STEP)<THICK,onV=(x%STEP)<THICK;
    var hv=rnd(0,tcy)*14-7,vv=rnd(tcx,0)*14-7,w=(tcx+tcy)%2;
    var r=246,g=242,b=232;
    if(onH&&onV){var l=w===0?hv:vv;r-=5-l*.35;g-=4-l*.3;b-=3-l*.25;}
    else if(onH){r+=hv*.45;g+=hv*.4;b+=hv*.35;}
    else if(onV){r+=vv*.45;g+=vv*.4;b+=vv*.35;}
    else{r-=12;g-=10;b-=8;}
    var noise=rnd(x*3+17,y*3+53)*8-4;
    d[i]=Math.max(215,Math.min(255,r+noise));d[i+1]=Math.max(210,Math.min(255,g+noise));
    d[i+2]=Math.max(200,Math.min(255,b+noise));d[i+3]=255;
  }}
  ox.putImageData(img,0,0);
  document.body.style.backgroundImage='url('+oc.toDataURL('image/png')+')';
  document.body.style.backgroundRepeat='repeat';
  document.body.style.backgroundSize='256px 256px';
})();
