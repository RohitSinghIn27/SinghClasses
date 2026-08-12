function renderSidebarToppers(toppersArray) {
    const container = $('sidebar-toppers'), listEl = $('sidebar-toppers-list');
    if (!container || !listEl) return;

    // Filter out invalid/empty entries
    let realToppers = toppersArray.filter(t => t && (t.name || t.studentName) && t.name !== "Awaiting...");
    if (realToppers.length === 0) { 
        container.style.display = 'none'; 
        return; 
    }

    // Safely extract numeric total marks / obtained score
    const getMarks = (t) => {
        let val = t.obtainedScore ?? t.score ?? t.totalMarks ?? t.marks ?? 0;
        return parseFloat(val) || 0;
    };

    // Safely extract accuracy percentage for tie-breaking
    const getAccuracy = (t) => {
        let val = (t.accuracy || "0").toString().replace("%", "");
        return parseFloat(val) || 0;
    };

    // Sort strictly by Total Marks (descending), then Accuracy (descending)
    realToppers.sort((a, b) => {
        let scoreDiff = getMarks(b) - getMarks(a);
        if (scoreDiff !== 0) return scoreDiff;
        return getAccuracy(b) - getAccuracy(a);
    });

    // Select top 7 records
    const top7 = realToppers.slice(0, 7);

    listEl.innerHTML = top7.map((t, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));
        const studentName = escapeHTML(t.name || t.studentName || 'Student');
        const marks = getMarks(t);
        
        const clsVal = t.classVal || t.studentClass || '';
        const secVal = t.sectionVal || t.studentSection || '';
        const clsSec = (clsVal && clsVal !== '-' ? clsVal : '') + (secVal && secVal !== '-' ? secVal : '');
        
        const schoolVal = t.school || t.schoolName || '';
        const school = schoolVal && schoolVal !== '-' ? ` ${schoolVal}` : '';

        return `<span class="topper-badge">${medal} <strong>${studentName}</strong> · ${marks} Marks${clsSec ? ` · ${clsSec}` : ''}${school}</span>`;
    }).join(' ');

    container.style.display = 'flex';
}
