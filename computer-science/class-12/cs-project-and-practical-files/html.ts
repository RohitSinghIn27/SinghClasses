export const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Download Gate</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 500px; width: 100%; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    h1 { font-size: 1.4rem; margin-bottom: 0.75rem; text-align: center; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; text-align: center; }
    .metric-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: center; }
    .metric-val { font-size: 2rem; font-weight: bold; color: #38bdf8; }
    .metric-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
    .input-group { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    input { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 0.75rem; color: #f8fafc; font-size: 0.85rem; outline: none; }
    button.btn-copy { background: #334155; color: #f8fafc; border: none; border-radius: 6px; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer; }
    button.btn-copy:hover { background: #475569; }
    .btn-download { display: block; width: 100%; padding: 0.85rem; border-radius: 6px; text-align: center; text-decoration: none; font-weight: 600; font-size: 1rem; border: none; cursor: not-allowed; background: #334155; color: #64748b; transition: all 0.2s; }
    .btn-download.unlocked { background: #10b981; color: #ffffff; cursor: pointer; }
    .btn-download.unlocked:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Project Access Gate</h1>
    <p>Share your personal referral link with 2 people. Once 2 visits are recorded, your PDF download unlocks automatically.</p>
    
    <div class="metric-box">
      <div class="metric-val" id="ref-count">...</div>
      <div class="metric-label">Referrals Completed</div>
    </div>

    <div class="input-group">
      <input type="text" id="share-link" readonly value="Generating link...">
      <button class="btn-copy" id="copy-btn" onclick="copyLink()">Copy</button>
    </div>

    <a id="download-btn" class="btn-download" href="javascript:void(0)">Locked (0/2 Referrals)</a>
  </div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        const link = window.location.origin + '/?ref=' + data.userId;
        document.getElementById('share-link').value = link;
        document.getElementById('ref-count').textContent = data.referrals + ' / ' + data.required;
        
        const btn = document.getElementById('download-btn');
        if (data.unlocked) {
          btn.className = 'btn-download unlocked';
          btn.textContent = 'Download Project PDF';
          btn.href = '/download';
        } else {
          btn.className = 'btn-download';
          btn.textContent = 'Locked (' + data.referrals + '/' + data.required + ' Referrals)';
          btn.href = 'javascript:void(0)';
        }
      } catch (err) {
        console.error('Failed to load status:', err);
      }
    }

    function copyLink() {
      const input = document.getElementById('share-link');
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }

    updateStatus();
  </script>
</body>
</html>`;