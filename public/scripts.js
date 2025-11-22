// Shared helpers
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function formatDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch { return ts; }
}
function showMsg(el, text, isError=false) {
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isError ? "var(--danger)" : "";
}

// URL validation
function isValidUrl(value) {
  try {
    // allow relative? the spec expects absolute URL; enforce absolute
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------------- DASHBOARD LOGIC ---------------- */
async function initDashboard() {
  const form = qs("#create-form");
  const inputUrl = qs("#input-url");
  const inputCode = qs("#input-code");
  const createBtn = qs("#create-btn");
  const resetBtn = qs("#reset-btn");
  const msg = qs("#create-msg");
  const listState = qs("#list-state");
  const linksBody = qs("#links-body");
  const linksTable = qs("#links-table");
  const search = qs("#search");

  let allLinks = [];

  async function fetchLinks() {
    listState.hidden = false;
    listState.textContent = "Loading links…";
    linksBody.innerHTML = "";
    try {
      const res = await fetch("/api/links");
      if (!res.ok) throw new Error("Failed to load links");
      allLinks = await res.json();
      renderLinks(allLinks);
    } catch (err) {
      listState.textContent = "Failed to load links.";
      console.error(err);
    }
  }

  function renderLinks(list) {
    listState.hidden = true;
    linksBody.innerHTML = "";
    if (!list || list.length === 0) {
      listState.hidden = false;
      listState.textContent = "No links yet. Create one above.";
      return;
    }
    for (const row of list) {
      const tr = document.createElement("tr");

      const codeTd = document.createElement("td");
      const codeLink = document.createElement("a");
      codeLink.href = `/code/${encodeURIComponent(row.code)}`;
      codeLink.className = "code-pill";
      codeLink.textContent = row.code;
      codeTd.appendChild(codeLink);

      const targetTd = document.createElement("td");
      const tlink = document.createElement("a");
      tlink.href = row.target_url;
      tlink.target = "_blank";
      tlink.rel = "noopener";
      tlink.className = "link-target";
      tlink.textContent = row.target_url;
      targetTd.appendChild(tlink);

      const clicksTd = document.createElement("td");
      clicksTd.textContent = row.total_clicks ?? 0;

      const lastTd = document.createElement("td");
      lastTd.textContent = formatDate(row.last_clicked);

      const actionsTd = document.createElement("td");
      actionsTd.className = "actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        const full = `${location.origin}/${row.code}`;
        try {
          await navigator.clipboard.writeText(full);
          copyBtn.textContent = "Copied!";
          setTimeout(()=> copyBtn.textContent = "Copy", 1200);
        } catch {
          alert(full);
        }
      });

      const delBtn = document.createElement("button");
      delBtn.className = "btn danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete ${row.code}? This cannot be undone.`)) return;
        try {
          const r = await fetch(`/api/links/${encodeURIComponent(row.code)}`, { method: "DELETE" });
          if (!r.ok) throw new Error("Delete failed");
          await fetchLinks();
        } catch (err) {
          alert("Failed to delete.");
          console.error(err);
        }
      });

      actionsTd.appendChild(copyBtn);
      actionsTd.appendChild(delBtn);

      tr.appendChild(codeTd);
      tr.appendChild(targetTd);
      tr.appendChild(clicksTd);
      tr.appendChild(lastTd);
      tr.appendChild(actionsTd);

      linksBody.appendChild(tr);
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    showMsg(msg, "");
    const url = inputUrl.value && inputUrl.value.trim();
    const code = inputCode.value && inputCode.value.trim();

    if (!url || !isValidUrl(url)) {
      showMsg(msg, "Please enter a valid absolute URL (http(s)://...)", true);
      return;
    }

    if (code && !/^[A-Za-z0-9]{6,8}$/.test(code)) {
      showMsg(msg, "Custom code must be 6–8 characters long: A-Z a-z 0-9", true);
      return;
    }

    createBtn.disabled = true;
    createBtn.textContent = "Creating…";

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: url, code: code || undefined })
      });

      if (res.status === 409) {
        showMsg(msg, "Code already exists. Please pick another.", true);
        return;
      }
      if (res.status === 400) {
        const err = await res.json().catch(()=>({ error: "Bad request" }));
        showMsg(msg, err.error || "Invalid data", true);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: "Unexpected error" }));
        showMsg(msg, err.error || "Failed to create link", true);
        return;
      }

      const data = await res.json();
      showMsg(msg, `Created: ${location.origin}/${data.code}`);
      inputUrl.value = "";
      inputCode.value = "";
      await fetchLinks();
    } catch (err) {
      console.error(err);
      showMsg(msg, "Network error. Try again.", true);
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Create";
    }
  });

  resetBtn.addEventListener("click", () => {
    inputUrl.value = "";
    inputCode.value = "";
    showMsg(msg, "");
  });

  search.addEventListener("input", (e) => {
    const q = (e.target.value || "").toLowerCase().trim();
    if (!q) return renderLinks(allLinks);
    const filtered = allLinks.filter(l =>
      l.code.toLowerCase().includes(q) ||
      (l.target_url || "").toLowerCase().includes(q)
    );
    renderLinks(filtered);
  });

  // initial fetch
  fetchLinks();
}

/* ---------------- STATS PAGE LOGIC ---------------- */
async function initStats() {
  // determine code from path: /code/<code>
  const parts = location.pathname.split("/").filter(Boolean);
  const code = parts[1] || parts[0]; // in case path differs
  const state = qs("#stats-state");
  const list = qs("#stats-list");
  const statCode = qs("#stat-code");
  const statTarget = qs("#stat-target");
  const statClicks = qs("#stat-clicks");
  const statLast = qs("#stat-last");
  const statCreated = qs("#stat-created");
  const openRedirect = qs("#open-redirect");
  const deleteBtn = qs("#delete-btn");
  const msg = qs("#stats-msg");

  if (!code) {
    state.textContent = "No code provided.";
    return;
  }

  state.textContent = "Loading…";
  list.hidden = true;

  async function load() {
    try {
      const r = await fetch(`/api/links/${encodeURIComponent(code)}`);
      if (r.status === 404) {
        state.textContent = "Link not found.";
        return;
      }
      if (!r.ok) {
        state.textContent = "Failed to load.";
        return;
      }
      const d = await r.json();
      state.hidden = true;
      list.hidden = false;
      statCode.textContent = d.code;
      statTarget.innerHTML = `<a href="${escapeHtml(d.target_url)}" target="_blank" rel="noopener">${escapeHtml(d.target_url)}</a>`;
      statClicks.textContent = d.total_clicks ?? 0;
      statLast.textContent = formatDate(d.last_clicked);
      statCreated.textContent = formatDate(d.created_at);
      openRedirect.href = `/${encodeURIComponent(d.code)}`;
    } catch (err) {
      console.error(err);
      state.textContent = "Network error.";
    }
  }

  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`Delete ${code}?`)) return;
    try {
      const r = await fetch(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!r.ok) {
        showMsg(msg, "Failed to delete.", true);
        return;
      }
      showMsg(msg, "Deleted. Redirecting to dashboard…");
      setTimeout(()=> location.href = "/", 900);
    } catch (err) {
      showMsg(msg, "Network error.", true);
    }
  });

  load();
}

/* Utility to avoid naive HTML injection in stats page */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"'`=\/]/g, function(s) {
    return ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
    })[s];
  });
}

/* Boot */
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("#create-form")) {
    initDashboard();
  }
  if (document.querySelector("#stats-card")) {
    initStats();
  }
});
