// Acceptance is scoped to a build, a directed route and a concrete dataset.
// A structural test, a reverse route or a different fixture cannot inherit it.
export function routeAcceptance(registry,{engineSHA256,from,to,fixtureSHA256}={}){
  const routes=registry?.version===1&&Array.isArray(registry.routes)?registry.routes:[];
  const matches=routes.filter(r=>r.from===from&&r.to===to&&r.engineSHA256===engineSHA256&&(!fixtureSHA256||r.fixtureSHA256===fixtureSHA256));
  const reviewed=matches.filter(r=>r.status==='reviewed-for-fixture'&&r.fixtureSHA256&&r.conditions&&r.observations&&r.browser&&r.exportFile&&[0,25,50,75,100].every(p=>r.checkpoints?.some(c=>c.percent===p&&c.screenshot))&&r.actions?.repeatSeek&&r.actions?.interrupt);
  return {status:reviewed.length?(reviewed.some(r=>r.verdict==='needs-polish')?'reviewed-with-caveats':'reviewed-for-fixture'):'unreviewed',scope:'Only the recorded data conditions and direction; no claim for arbitrary input. Scenario interruption evidence has its own stated route.',evidence:reviewed};
}
