const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
function toast(msg){ const t = $("#toast"); if(!t) return; t.textContent = msg; t.classList.remove("hidden"); setTimeout(()=>t.classList.add("hidden"), 1400); }

function readProfile(){ try { return JSON.parse(localStorage.getItem("cc_profile")||"{}"); } catch { return {}; } }
function saveProfile(p){ localStorage.setItem("cc_profile", JSON.stringify(p)); }

function recommend(profile){
  const rec = { units:[], skills:[], projects:[] };
  const loves = new Set(profile.interests||[]);
  const role = profile.role||"";

  if(loves.has("web") || role.includes("Software")){
    rec.units.push("SIT313/SIT317 – Web App Dev");
    rec.skills.push("React fundamentals","REST APIs","Auth basics");
    rec.projects.push("React dashboard for student pathways");
  }
  if(loves.has("data") || role.includes("Data")){
    rec.units.push("SIT718 – Real World Analytics");
    rec.skills.push("Python/Pandas","SQL joins","Data viz");
    rec.projects.push("ETL student activity data & KPI charts");
  }
  if(loves.has("security") || role.includes("Cyber")){
    rec.units.push("SIT719 – Security & Privacy in Analytics");
    rec.skills.push("Threat modeling","K-anonymity","Adversarial ML basics");
    rec.projects.push("Privacy-preserving analytics on student pathways");
  }
  if(loves.has("cloud") || role.includes("DevOps")){
    rec.units.push("SIT764 – Cloud & DevOps");
    rec.skills.push("AWS basics","Docker","CI/CD");
    rec.projects.push("Deploy Career Compass with CI");
  }
  if(loves.has("ai")){
    rec.units.push("SIT742 – Machine Learning");
    rec.skills.push("Scikit-learn","Model evaluation","Feature engineering");
    rec.projects.push("Role matching classifier (prototype)");
  }

  const uniq = (arr) => [...new Set(arr)].slice(0,4);
  rec.units = uniq(rec.units); rec.skills = uniq(rec.skills); rec.projects = uniq(rec.projects);
  return rec;
}

function renderResults(target, snapshot){
  const wrap = $(target);
  if(!wrap) return;
  wrap.innerHTML = "";
  const sections = [
    ["Recommended units", snapshot.recommendations.units],
    ["Key skills to build", snapshot.recommendations.skills],
    ["Suggested projects", snapshot.recommendations.projects],
  ];
  sections.forEach(([title, items])=>{
    const div = document.createElement("div");
    div.className = "border rounded-2xl bg-white p-5";
    div.innerHTML = `<div class="font-semibold">${title}</div><ul class="list-disc list-inside text-slate-700 mt-2">${(items||[]).map(i=>`<li>${i}</li>`).join("")}</ul>`;
    wrap.appendChild(div);
  });
  const meta = document.createElement("div");
  meta.className = "border rounded-2xl bg-white p-5 text-sm text-slate-700";
  meta.innerHTML = `<strong>Student</strong>: ${snapshot.profile.name||"—"} • <strong>Year</strong>: ${(snapshot.profile.year||"—")} • <strong>Role</strong>: ${(snapshot.profile.role||"—")}`;
  wrap.appendChild(meta);
}

document.addEventListener("DOMContentLoaded", () => {
  // Survey behaviour
  const form = $("#surveyForm");
  if(form){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const profile = {
        name: fd.get("name")?.trim(),
        email: fd.get("email")?.trim(),
        year: fd.get("year"),
        role: fd.get("role"),
        interests: fd.getAll("interests"),
        strengths: fd.getAll("strengths"),
        createdAt: Date.now()
      };
      if(!profile.interests.length){ toast("Choose at least one interest"); return; }
      saveProfile(profile);
      const rec = recommend(profile);
      const shareId = cryptoRandom();
      const snapshot = { id: shareId, profile, recommendations: rec, createdAt: Date.now() };
      const store = JSON.parse(localStorage.getItem("cc_snapshots")||"{}");
      store[shareId] = snapshot;
      localStorage.setItem("cc_snapshots", JSON.stringify(store));
      location.href = `results.html?share=${shareId}`;
    });
  }

  // Results page
  const resultsDiv = $("#results");
  if(resultsDiv){
    let sid = params.get("share");
    const store = JSON.parse(localStorage.getItem("cc_snapshots")||"{}");
    if(!sid){ sid = Object.keys(store).slice(-1)[0]; }
    const snap = sid ? store[sid] : null;
    if(!snap){ resultsDiv.innerHTML = '<div class="border rounded-2xl bg-white p-5">No results yet. <a class="underline" href="survey.html">Complete the survey</a>.</div>'; return; }
    renderResults("#results", snap);

    const copyBtn = $("#copyLinkBtn");
    const out = $("#linkOut");
    if(copyBtn){
      copyBtn.addEventListener("click", async ()=>{
        const advisorSnap = { ...snap, profile: { ...snap.profile, email: undefined } };
        const advisorStore = JSON.parse(localStorage.getItem("cc_advisor_snaps")||"{}");
        advisorStore[snap.id] = advisorSnap;
        localStorage.setItem("cc_advisor_snaps", JSON.stringify(advisorStore));

        const base = location.origin + location.pathname.replace(/results\.html$/, "");
        const link = `${base}advisor.html?share=${encodeURIComponent(snap.id)}`;
        try{ await navigator.clipboard.writeText(link); toast("Advisor link copied"); }
        catch(e){ out.textContent = link; toast("Copy not available; link shown"); }
      });
    }
    const wipe = $("#wipeBtn");
    if(wipe){
      wipe.addEventListener("click", ()=>{
        localStorage.removeItem("cc_profile");
        localStorage.removeItem("cc_snapshots");
        localStorage.removeItem("cc_advisor_snaps");
        toast("All local data cleared");
        setTimeout(()=>location.href="index.html", 800);
      });
    }
  }

  // Advisor view
  const adv = $("#advisor");
  if(adv){
    const sid = params.get("share");
    const store = JSON.parse(localStorage.getItem("cc_snapshots")||"{}");
    const snap = sid ? store[sid] : null;
    if(!snap){ adv.innerHTML = '<div class="border rounded-2xl bg-white p-5">Snapshot not found. Ask the student to re-share.</div>'; return; }
    const safeSnap = { ...snap, profile: { ...snap.profile } }; delete safeSnap.profile.email;
    renderResults("#advisor", safeSnap);
  }

  // Contact form
  const cf = $("#contactForm");
  if(cf){
    cf.addEventListener("submit", (e)=>{ e.preventDefault(); toast("Thanks! Your message has been recorded for the demo."); cf.reset(); });
  }
});

function cryptoRandom(){
  const a = new Uint8Array(8);
  if(window.crypto && window.crypto.getRandomValues){ window.crypto.getRandomValues(a); }
  return [...a].map(x=>x.toString(16).padStart(2,"0")).join("");
}
