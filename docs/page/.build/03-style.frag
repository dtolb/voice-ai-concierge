<style>
  :root{
    --field:#ECF1F3;
    --paper:#FFFFFF;
    --ink:#14283A;
    --muted:#5A6B7A;
    --line:#C6D2D9;
    --edge:#A8B7C0;

    /* semantic trio: platform, the app you build, the far end */
    --plat:#2E6FA3;
    --app:#C42B72;
    --far:#2E7D5B;


    --code:#0E1B27;
    --codeink:#D8E4EC;
    --codemuted:#6E879A;

    --display:"Avenir Next","Futura","Century Gothic","Trebuchet MS",sans-serif;
    --body:"Helvetica Neue",Helvetica,Arial,sans-serif;
    --mono:"SF Mono",ui-monospace,Menlo,Consolas,monospace;

    --measure:62rem;
    --wide:82.5rem;
    --gutter:clamp(1.125rem,4vw,2.5rem);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    background:var(--field);color:var(--ink);font-family:var(--body);line-height:1.68;
    font-size:clamp(1rem,0.55rem + 0.6vw,1.125rem);overflow-wrap:break-word;
    background-image:
      repeating-linear-gradient(0deg,transparent 0 79px,rgba(46,111,163,.055) 79px 80px),
      repeating-linear-gradient(90deg,transparent 0 79px,rgba(46,111,163,.055) 79px 80px);
  }
  .wrap{
    max-width:var(--wide);margin-inline:auto;
    padding:clamp(2rem,5vw,4rem) var(--gutter) 6rem;
    display:grid;
    grid-template-columns:
      [wide-start] minmax(0,1fr)
      [prose-start] minmax(0,var(--measure)) [prose-end]
      minmax(0,1fr) [wide-end];
  }
  .wrap > *{grid-column:prose;min-width:0;max-width:100%}
  .wrap > .wide{grid-column:wide}
  .wide,pre{overflow-x:auto}
  a{color:var(--ink)}
  a:focus-visible{outline:2px solid var(--plat);outline-offset:2px}

  /* masthead */
  .eyebrow{
    font-family:var(--mono);font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;
    color:var(--muted);margin-block-end:.7rem;
  }
  h1{
    font-family:var(--display);font-weight:600;letter-spacing:-.02em;line-height:1.07;
    font-size:clamp(2.1rem,5vw,3.15rem);margin-block-end:1rem;
  }
  .lede{font-size:1.06rem;color:var(--muted);margin-block-end:1.4rem}
  .lede strong{color:var(--ink);font-weight:600}
  .facts{display:flex;flex-wrap:wrap;gap:.5rem;margin-block-end:.5rem}
  .facts > div{
    background:var(--paper);border:1px solid var(--line);padding:.35rem .7rem;
    font-family:var(--mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;
    color:var(--muted);display:flex;gap:.45rem;align-items:baseline;
  }
  .facts b{color:var(--ink);font-weight:600;font-size:.82rem}

  /* contents */
  .toc{border-block:1px solid var(--line);padding-block:1.1rem 1.15rem;margin-block:1.8rem 0}
  .toc .toch{
    font-family:var(--mono);font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);margin-block-end:.65rem;
  }
  .toc ol{list-style:none;padding-left:0;margin-block-end:0}
  .toc li{margin-block-end:.4rem;display:flex;gap:.7rem;align-items:baseline}
  .toc li:last-child{margin-block-end:0}
  .toc .tn{font-family:var(--mono);font-size:.64rem;letter-spacing:.1em;color:var(--muted)}
  .toc a{text-decoration:none;border-bottom:1px solid var(--line)}
  .toc a:hover{color:var(--plat);border-color:var(--plat)}

  /* section heads */
  .sec-head{scroll-margin-block-start:1rem;
    display:flex;align-items:baseline;gap:.85rem;
    border-block-start:1px solid var(--line);padding-block-start:1.1rem;
    margin-block-start:3.4rem;margin-block-end:1.3rem;
  }
  .sec-head .num b{
    font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;color:var(--plat);font-weight:600;
  }
  .sec-head h2{
    font-family:var(--display);font-weight:600;font-size:clamp(1.3rem,2.4vw,1.72rem);
    letter-spacing:-.01em;line-height:1.2;
  }
  h3{
    font-family:var(--display);font-weight:600;font-size:1.1rem;
    margin-block-start:2rem;margin-block-end:.6rem;
  }
  p{margin-block-end:1rem}
  ul,ol{margin-block-end:1rem;padding-left:1.35rem}
  li{margin-block-end:.4rem}
  code{
    font-family:var(--mono);font-size:.82em;background:var(--paper);
    border:1px solid var(--line);padding:.05em .3em;border-radius:2px;
  }
  .note{color:var(--muted);font-size:.94rem;margin-block-end:1rem}
  .callout{
    background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--plat);
    padding:1.1rem 1.25rem .4rem;margin-block-end:1.3rem;
  }
  .callout > .ct{
    font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);margin-block-end:.6rem;
  }
  .callout.app{border-left-color:var(--app)}
  .callout.far{border-left-color:var(--far)}
  .callout ul{margin-block-end:.75rem}
  .callout li{margin-block-end:.5rem}

  /* topology */
  .topo{background:var(--paper);border:1px solid var(--line);padding:.4rem .6rem .1rem;overflow-x:auto}
  .topo svg{display:block;width:100%;min-width:900px;height:auto}
  .nlabel{font-family:var(--body);font-size:13px;fill:var(--ink)}
  .nsub{font-family:var(--mono);font-size:9px;letter-spacing:.07em;fill:var(--muted);text-transform:uppercase}
  .elabel{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;fill:var(--muted)}
  .glabel{font-family:var(--mono);font-size:9px;letter-spacing:.16em;fill:var(--muted);text-transform:uppercase}
  .node{cursor:pointer}
  .node rect{fill:var(--paper);stroke-width:1.5}
  .node:hover rect{fill:#F7FAFB}
  .node:focus{outline:none}
  .node:focus-visible rect{stroke-width:3}
  .node.sel rect{stroke-width:3;fill:#F2F7F9}
  .edge{stroke:var(--edge);stroke-width:1.4;fill:none}
  .edge.dash{stroke-dasharray:4 3}
  .gbox{stroke:var(--line);stroke-width:1;stroke-dasharray:4 4;fill:none}
  .hint{
    font-family:var(--mono);font-size:.64rem;letter-spacing:.1em;text-transform:uppercase;
    color:var(--muted);margin-block:.7rem 0;
  }
  .node-detail{
    background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--acc,var(--line));
    padding:1.1rem 1.25rem;margin-block-start:.9rem;
  }
  .node-detail h4{font-family:var(--display);font-size:1rem;font-weight:600;margin-block-end:.5rem}
  /* Label column is sized to its content and right-aligned, so each label sits against
     the line it describes. A wide left-aligned column reads as a sentence down the page. */
  .node-detail dl{
    display:grid;grid-template-columns:auto 1fr;gap:0 .9rem;
    font-size:.9rem;margin-block-start:.25rem;
  }
  .node-detail dt{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;
    color:var(--muted);text-align:right;white-space:nowrap;
    padding-block:.68rem .5rem;border-block-start:1px solid var(--line);
  }
  .node-detail dd{padding-block:.5rem;border-block-start:1px solid var(--line)}
  .node-detail dt:first-of-type,.node-detail dd:first-of-type{border-block-start:0;padding-block-start:0}
  .node-detail dt:first-of-type{padding-block-start:.18rem}
  @media (max-width:560px){
    .node-detail dl{grid-template-columns:1fr;gap:0}
    .node-detail dt{text-align:left;padding-block:.7rem .15rem}
    .node-detail dd{border-block-start:0;padding-block:0 .1rem}
  }

  /* ladders */
  .lblock{margin-block-end:2.2rem}
  .lblock > h3{margin-block-start:1.6rem;margin-block-end:.15rem}
  .lcap{color:var(--muted);font-size:.92rem;margin-block-end:.5rem}
  .lanes{
    display:grid;grid-template-columns:repeat(5,1fr);
    position:sticky;top:0;z-index:6;
    background:var(--field);padding:.7rem 0 .65rem;border-bottom:1px solid var(--line);
  }
  .lane{display:flex;flex-direction:column;align-items:center;gap:.3rem;text-align:center}
  .lane .dot{width:9px;height:9px;border-radius:50%}
  .lane span{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.09em;text-transform:uppercase;color:var(--ink);
  }
  .dot.far{background:var(--far)} .dot.plat{background:var(--plat)}
  .dot.app{background:var(--app)} .dot.ai{background:#6B7A99} .dot.ci{background:#4D5777}
  .ladder{position:relative;padding:.5rem 0 .25rem}
  .rails{position:absolute;inset:0;pointer-events:none;z-index:0}
  .rails i{position:absolute;top:0;bottom:0;width:1px;background:var(--line)}
  .step{position:relative;z-index:1}
  .row{
    position:relative;display:flex;align-items:center;width:100%;padding:1rem 0;
    background:none;border:0;cursor:pointer;font:inherit;color:inherit;text-align:left;
  }
  .row::before{
    content:"";position:absolute;top:50%;transform:translateY(-50%);
    left:var(--from);right:calc(100% - var(--to));height:1.5px;background:var(--wc,var(--line));
  }
  .row::after,.row .head2{
    content:"";position:absolute;top:50%;transform:translateY(-50%);z-index:2;
    width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;
  }
  .row[data-dir="r"]::after,.row[data-dir="b"]::after{
    left:calc(var(--to) - 8px);border-left:8px solid var(--wc,var(--line));
  }
  .row[data-dir="l"]::after,.row[data-dir="b"] .head2{
    left:var(--from);border-right:8px solid var(--wc,var(--line));
  }
  .wlabel{
    position:relative;z-index:1;background:var(--paper);border:1px solid var(--line);
    width:clamp(150px,calc(20vw - 44px),216px);flex:0 0 auto;padding:.45rem .7rem .55rem;
    margin-left:calc((var(--from) + var(--to)) / 2);transform:translateX(-50%);
    display:flex;flex-direction:column;align-items:stretch;gap:1px;
    transition:border-color .14s,box-shadow .14s;
  }
  .wlabel .hdr{display:flex;align-items:center;justify-content:space-between;gap:.4rem}
  .wlabel .n{font-family:var(--mono);font-size:.6rem;letter-spacing:.12em;color:var(--muted)}
  .wlabel .t{font-size:.82rem;line-height:1.3}
  .wlabel .chev{font-size:.55rem;color:var(--muted);transition:transform .16s}
  .row:hover .wlabel{border-color:var(--wc,var(--ink));box-shadow:0 1px 0 var(--wc,var(--ink))}
  .row:focus-visible .wlabel{outline:2px solid var(--wc,var(--ink));outline-offset:2px}
  .step.open .wlabel{border-color:var(--wc,var(--ink));box-shadow:inset 0 0 0 1px var(--wc,var(--ink))}
  .step.open .wlabel .chev{transform:rotate(90deg)}
  .step.open .row{--wc:var(--acc)}
  .detail{
    background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--acc,var(--line));
    padding:1rem 1.15rem 1.1rem;margin-block-end:.7rem;
  }
  .detail .what{font-size:.94rem;margin-block-end:.5rem}
  .detail .why{font-size:.88rem;color:var(--muted)}
  .detail .why b{color:var(--ink);font-weight:600}
  .detail pre{margin-block-start:.7rem}
  .bulk{display:flex;gap:.4rem;margin-block-end:.3rem}
  .bulk button{
    font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;
    background:var(--paper);border:1px solid var(--line);color:var(--muted);padding:.2rem .5rem;cursor:pointer;
  }
  .bulk button:hover{border-color:var(--ink);color:var(--ink)}

  /* Below 760px the five rails collapse into unreadable slivers, so each hop
     becomes a full-width panel and the lane colour moves to a left border. */
  @media (max-width:760px){
    .lanes{display:none}
    .rails{display:none}
    .row{padding:.5rem 0 .2rem}
    .row::before,.row::after,.row .head2{display:none}
    .wlabel{
      width:100%;margin-left:0;transform:none;
      border-left:3px solid var(--acc,var(--line));
    }
    .wlabel .t::after{
      content:attr(data-hop);display:block;
      color:var(--muted);font-family:var(--mono);font-size:.6rem;letter-spacing:.06em;
      text-transform:uppercase;margin-block-start:.25rem;
    }
  }

  pre{
    background:var(--code);color:var(--codeink);font-family:var(--mono);
    font-size:.74rem;line-height:1.65;padding:.8rem .95rem;margin-block-end:1.1rem;border-radius:2px;
  }
  pre b{color:#8FD1A8;font-weight:400}
  pre i{color:var(--codemuted);font-style:normal}
  pre u{color:#F0B37E;text-decoration:none}

  table{width:100%;border-collapse:collapse;background:var(--paper);border:1px solid var(--line)}
  th{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;
    text-align:left;color:var(--muted);padding:.65rem .85rem;border-bottom:1px solid var(--line);font-weight:400;
  }
  td{padding:.7rem .85rem;border-bottom:1px solid var(--line);font-size:.86rem;vertical-align:top}
  tr:last-child td{border-bottom:0}
  .wide table{min-width:720px}

  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.9rem}
  .card{
    background:var(--paper);border:1px solid var(--line);border-top:3px solid var(--acc,var(--plat));
    padding:1rem 1.1rem 1.1rem;display:flex;flex-direction:column;
  }
  .card h4{font-family:var(--display);font-size:1rem;font-weight:600;margin-block-end:.15rem}
  .card .api{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.06em;color:var(--muted);
    display:block;margin-block-end:.6rem;
  }
  .card p{font-size:.86rem;margin-block-end:.7rem}
  .card ul{font-size:.84rem;margin-block-end:.7rem}
  .card .when{
    font-family:var(--mono);font-size:.6rem;letter-spacing:.11em;text-transform:uppercase;
    color:var(--ink);border-top:1px dashed var(--line);padding-block-start:.6rem;margin-top:auto;
  }
  .card a{text-decoration:none;border-bottom:1px solid var(--line)}
  .card a:hover{border-color:var(--acc,var(--plat))}

  .reflinks{display:flex;flex-wrap:wrap;gap:.4rem;margin-block-end:1.2rem}
  .reflinks a{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.09em;text-transform:uppercase;
    border:1px solid var(--line);color:var(--muted);text-decoration:none;padding:.25rem .5rem;
    transition:background .14s,color .14s,border-color .14s;
  }
  .reflinks a::after{content:"\2197";margin-left:.25rem;opacity:.5}
  .reflinks a:hover{background:var(--plat);border-color:var(--plat);color:#fff}

  .legend{display:flex;flex-wrap:wrap;gap:.9rem;margin-block:.8rem 1.2rem}
  .legend > div{
    display:flex;align-items:center;gap:.4rem;
    font-family:var(--mono);font-size:.64rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);
  }
  .legend i{width:12px;height:12px;border-radius:2px;display:inline-block}

  footer{
    border-top:1px solid var(--line);margin-block-start:3.5rem;padding-block-start:1.3rem;
    color:var(--muted);font-size:.84rem;
  }
  footer p{margin-block-end:.55rem}
  .delta{
    background:var(--paper);border:1px solid var(--line);
    border-inline-start:3px solid var(--acc,var(--line));padding:1rem 1.15rem .4rem;
    margin-block-end:1.2rem;
  }
  .delta .dt{
    font-family:var(--mono);font-size:.62rem;letter-spacing:.13em;text-transform:uppercase;
    color:var(--ink);margin-block-end:.55rem;
  }
  .delta ul{font-size:.92rem;margin-block-end:.75rem}
  .delta li{margin-block-end:.45rem}


  /* setup steps */
  .setup{counter-reset:none;display:flex;flex-direction:column;gap:1rem;margin-block:1rem 1.5rem}
  .sstep{
    background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--acc,var(--plat));
    padding:1.1rem 1.25rem .4rem;
  }
  .sstep .shead{display:flex;align-items:baseline;gap:.8rem;flex-wrap:wrap;margin-block-end:.5rem}
  .sstep .sn{font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;color:var(--muted)}
  .sstep h3{font-family:var(--display);font-size:1.08rem;font-weight:600;margin:0}
  .sstep .where{font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-inline-start:auto}
  .sstep p,.sstep li{font-size:.93rem}
  .sstep ul{margin-block-end:.8rem}
  .sstep pre{margin-block:.4rem .9rem}
  .sstep .gotcha{border-top:1px dashed var(--line);padding-block-start:.6rem;color:var(--muted);font-size:.88rem}
  .sstep .gotcha b{color:var(--ink)}
  .sstep .reflinks{margin-block:.2rem .9rem}
  .deps svg{display:block;width:100%;min-width:760px;height:auto}

  @media (prefers-reduced-motion:reduce){*{transition:none !important}html{scroll-behavior:auto}}
</style>
